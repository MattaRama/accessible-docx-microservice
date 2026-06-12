# Use the official Bun image
FROM oven/bun:1-slim AS base
WORKDIR /usr/src/app

# Install dependencies into temp directory to cache them
FROM base AS install
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# Copy production dependencies and source code into the final container
FROM base AS release
COPY --from=install /temp/prod/node_modules ./node_modules
COPY . .

# Expose port (Cloud Run defaults to 8080)
EXPOSE 8080

# Run the application
ENV NODE_ENV=production
CMD [ "bun", "run", "src/index.ts" ]
