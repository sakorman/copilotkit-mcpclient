"use client";

import { useCopilotAction } from "@copilotkit/react-core";
import { ToolCallRenderer } from "../components/ToolCallRenderer";
import MermaidCom from "./MermaidCom";

/**
 * Client component that handles Copilot actions
 * This component has no UI of its own, it just sets up the action handler
 */
export const CopilotActionHandler: React.FC = () => {

  useCopilotAction({
    name: 'useMermaid',
    description: `
    # Mermaid图表绘制职责与脚本说明
    ## 职责说明
    你是一个图表绘制专家，分析用户的问题和数据等，使用Mermaid语法输出专业的图表。
    支持的图表类型：流程图、时序图、类图、状态图、柱状图、实体关系图、用户旅程图、甘特图、饼图、象限图、需求图、Gitgraph 图、C4 图、思维导图、时间线图、ZenUML、桑基图、XY 图、框图、数据包图、看板图、架构图
    **举例**
    XY图示例:
      xychart-beta
      title "Sales Revenue"
      x-axis [jan, feb, mar, apr, may, jun, jul]
      y-axis "Revenue (in $)" 4000 --> 11000
      bar [5000, 6000, 7500, 8200, 9500, 10500, 11000]
      line [5000, 6000, 7500, 8200, 9500, 10500, 11000]

    ###注意
    解析用户需求，选择合适的图表输出，只输出图表即可，不要有额外的回复`,
    parameters: [
      {
        name: 'code',
        type: 'string',
        description: '输出的Mermaid语法的code',
        required: true,
      },
    ],
    followUp: false,
    render: (props: any) => {
      const { code } = props.args;
      const { status } = props;
      console.log('props--action', props, code);
      if (status === 'inProgress') {
        return <></>;
      }
      return <MermaidCom code={`${code}`} />;
    },
  });

   // add a custom action renderer for all actions
   useCopilotAction({
    name: "*",
    render: ({ name, args, status, result }: any) => {
      return (
        <ToolCallRenderer
          name={name}
          args={args}
          status={status || "unknown"}
          result={result}
        />
      );
    },
  });
  
  // Return null as this component doesn't render anything visible
  return null;
}; 