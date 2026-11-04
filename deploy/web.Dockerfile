# The image of the web app. Build it from the repository root:
#   docker build --platform linux/amd64 -f deploy/web.Dockerfile .
#
# The image also holds db/migrations and the migration script. On each start,
# it applies the missing migrations (`yarn db:migrate`) before the server
# starts. A failed migration stops the start.

FROM node:24.22.2-alpine3.24@sha256:8a32c8cf649a49915a66e81e7a609223c708d0adabf288ee3f4077d765542f85 AS base
WORKDIR /app
RUN corepack enable
COPY package.json yarn.lock .yarnrc.yml ./

# Install all dependencies and build the web app.
FROM base AS build
RUN yarn install --immutable
COPY . .
RUN yarn build

# Install the production dependencies only. The devDependencies, for example
# release-it and Vite, do not go into the image.
FROM base AS runtime
ENV NODE_ENV=production
RUN yarn workspaces focus --production \
  && yarn cache clean --all \
  && rm -rf /root/.cache /root/.yarn
# The migration script imports src/env.ts and modules of src/core.
COPY src/env.ts src/
COPY src/core src/core
COPY src/scripts src/scripts
COPY db/migrations db/migrations
COPY --from=build /app/.output .output
USER node
ENV HOST=0.0.0.0 PORT=3000
EXPOSE 3000
# The same commands as `yarn db:migrate` and `yarn start`, with no Yarn
# process between Docker and Node. Node then gets the signals directly.
CMD ["sh", "-c", "node src/scripts/migrateDatabase.ts && exec node .output/server/index.mjs"]
