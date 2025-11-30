import sqlite3 from 'sqlite3';
import { createFilePath } from '../utils';

interface MqttHistoryRecord {
  id: number;
  topic: string;
  message: string;
  timestamp: string;
}

interface RetentionPolicy {
  days: number;      // 保留天数
  checkInterval: number;  // 检查间隔(毫秒)
}

export class DatabaseManager {
  private db: sqlite3.Database;
  private static instance: DatabaseManager;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  // 默认保留策略：7天，每天检查一次
  private retentionPolicy: RetentionPolicy = {
    days: 7,
    checkInterval: 24 * 60 * 60 * 1000  // 24小时
  };

  private constructor() {
    const dbPath = createFilePath('.cache', 'mqtt_history.db');
    this.db = new sqlite3.Database(dbPath);
    this.init();
    this.startCleanupTask();
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  // 设置保留策略
  public setRetentionPolicy(policy: Partial<RetentionPolicy>) {
    this.retentionPolicy = {
      ...this.retentionPolicy,
      ...policy
    };

    // 重启清理任务
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.startCleanupTask();
  }
  // 获取当前的保留策略
  public getRetentionPolicy() {
    return this.retentionPolicy
  }

  private init() {
    // 创建表并添加索引
    this.db.serialize(() => {
      // 创建表
      this.db.run(`
        CREATE TABLE IF NOT EXISTS mqtt_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          topic TEXT NOT NULL,
          message TEXT NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 创建索引以提升查询性能
      this.db.run('CREATE INDEX IF NOT EXISTS idx_topic ON mqtt_history(topic)');
      this.db.run('CREATE INDEX IF NOT EXISTS idx_timestamp ON mqtt_history(timestamp)');
    });
  }

  private startCleanupTask() {
    // 按照配置的间隔执行清理
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldData().catch(err => {
        console.error('清理历史数据失败:', err);
      });
    }, this.retentionPolicy.checkInterval);

    // 立即执行一次清理
    this.cleanupOldData().catch(err => {
      console.error('清理历史数据失败:', err);
    });
  }

  private async cleanupOldData(): Promise<void> {
    const retentionDate = new Date();
    // 根据配置的天数计算保留日期
    retentionDate.setDate(retentionDate.getDate() - this.retentionPolicy.days);
    
    return new Promise((resolve, reject) => {
      // 在删除之前，先获取要删除的记录数
      this.db.get(
        'SELECT COUNT(*) as count FROM mqtt_history WHERE timestamp < datetime(?)',
        [retentionDate.toISOString()],
        (err: Error | null, row: any) => {
          if (err) {
            reject(err);
            return;
          }

          const countToDelete = row.count;
          if (countToDelete > 0) {
            // 执行删除操作
            this.db.run(
              'DELETE FROM mqtt_history WHERE timestamp < datetime(?)',
              [retentionDate.toISOString()],
              (err: Error | null) => {
                if (err) {
                  reject(err);
                  return;
                }

                console.log(`已清理 ${countToDelete} 条过期数据`);
                
                // 如果删除的数据量较大，执行VACUUM来回收空间
                if (countToDelete > 1000) {
                  this.db.run('VACUUM', (vacuumErr: Error | null) => {
                    if (vacuumErr) reject(vacuumErr);
                    else resolve();
                  });
                } else {
                  resolve();
                }
              }
            );
          } else {
            resolve();
          }
        }
      );
    });
  }

  public saveMessage(topic: string, message: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO mqtt_history (topic, message) VALUES (?, ?)',
        [topic, message],
        (err: Error | null) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  public getHistory(
    topic: string, 
    limit: number = 10,
    startTime?: Date,
    endTime?: Date
  ): Promise<MqttHistoryRecord[]> {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM mqtt_history WHERE topic = ?';
      const params: any[] = [topic];

      if (startTime) {
        query += ' AND timestamp >= datetime(?)';
        params.push(startTime.toISOString());
      }
      if (endTime) {
        query += ' AND timestamp <= datetime(?)';
        params.push(endTime.toISOString());
      }

      query += ' ORDER BY timestamp DESC LIMIT ?';
      params.push(limit);

      this.db.all(
        query,
        params,
        (err: Error | null, rows: MqttHistoryRecord[]) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  public getAllHistory(
    limit: number = 10,
    startTime?: Date,
    endTime?: Date
  ): Promise<MqttHistoryRecord[]> {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM mqtt_history';
      const params: any[] = [];

      if (startTime) {
        query += ' WHERE timestamp >= datetime(?)';
        params.push(startTime.toISOString());
      }
      if (endTime) {
        query += startTime ? ' AND' : ' WHERE';
        query += ' timestamp <= datetime(?)';
        params.push(endTime.toISOString());
      }

      query += ' ORDER BY timestamp DESC LIMIT ?';
      params.push(limit);

      this.db.all(
        query,
        params,
        (err: Error | null, rows: MqttHistoryRecord[]) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  public async getStorageStats(): Promise<{
    totalRecords: number;
    oldestRecord: string;
    newestRecord: string;
    sizeInMB: number;
  }> {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT 
          COUNT(*) as total,
          MIN(timestamp) as oldest,
          MAX(timestamp) as newest,
          page_count * page_size / 1024.0 / 1024.0 as size_mb
        FROM mqtt_history, pragma_page_count(), pragma_page_size()`,
        (err: Error | null, row: any) => {
          if (err) reject(err);
          else resolve({
            totalRecords: row.total,
            oldestRecord: row.oldest,
            newestRecord: row.newest,
            sizeInMB: row.size_mb
          });
        }
      );
    });
  }

  public close() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.db.close();
  }
} 