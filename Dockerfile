# 1) Start from a lightweight Python image
FROM python:3.11-slim

# 2) Install Node.js, and any basic build dependencies your agent or Node might need
#    For instance, `build-essential` or `curl`.
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
 && rm -rf /var/lib/apt/lists/*

# 3) Install uv
# RUN curl -LsSf https://astral.sh/uv/install.sh | sh
RUN curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR="/usr/local/bin" sh

# 4) Install Node 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# 5) Install pnpm globally
RUN npm install -g pnpm@9.15.3

# 6) Install @langchain/langgraph-cli 
RUN npm install -g @langchain/langgraph-cli

# # 6) (Optional) Install Poetry for Python
# RUN pip install --no-cache-dir poetry

# 7) Create a working directory
WORKDIR /app

# Install the `mcp-grafana` (v0.2.6)
RUN mkdir -p ./mcpgrafana

RUN curl -L -o mcpgrafana.tar.gz https://github.com/grafana/mcp-grafana/releases/download/v0.2.6/mcp-grafana_Linux_x86_64.tar.gz

RUN tar -xzvf mcpgrafana.tar.gz -C ./mcpgrafana

# 8) Copy only Node-related manifests first (package.json, pnpm-lock.yaml)
#    This lets Docker cache the pnpm install layer if dependencies haven't changed.
COPY package.json pnpm-lock.yaml ./

# 9) Install Node dependencies
RUN pnpm install

# 10) Copy the full project into the image
COPY . .

# 11) Build the frontend
RUN pnpm build

# 10) Install Python dependencies for the agent using Poetry
#     We'll assume there's a pyproject.toml/poetry.lock in /agent or at project root.
# WORKDIR /app/agent
# # Ensure poetry.lock is updated before running poetry install
# RUN poetry lock  && poetry install --no-root
# RUN pip install -U "langgraph-cli[inmem]"

# 12) Switch back to /app/agent-js
WORKDIR /app/agent-js

# 13) Install Node dependencies
RUN pnpm install --unsafe-perm

# RUN pnpm install

# 14) Switch back to /app
WORKDIR /app

# 15) Expose the ports used by the frontend and the agent
#     - By default, dev-frontend = 3000
#     - By default, dev-agent = 8123 (from your script)
EXPOSE 3000
EXPOSE 8123

# 16) Define the default command to run both the agent and frontend together
#     This will use your "dev" script from package.json,
#     which in turn calls "concurrently" to run dev-frontend & dev-agent in parallel.
CMD ["pnpm", "run", "start:all"]