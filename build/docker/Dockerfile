FROM node:latest AS base

ENV APP_HOME /app
ENV PUBLIC_PATH /${APP_HOME}/public
ENV SERVER_PATH /${APP_HOME}/server
ENV NODE_MODULES_PATH /${APP_HOME}/node_modules
ENV STATIC_CODEGEN_PATH /${APP_HOME}/static_codegen
ENV PACKAGE_JSON_PATH /${APP_HOME}/package.json
WORKDIR ${APP_HOME}

# generating proto code, building bundles and running tests
FROM base AS builder
COPY . .
RUN npm install
RUN npm run build

# creating release image
FROM base AS release
COPY --from=builder ${PUBLIC_PATH} ${PUBLIC_PATH}
COPY --from=builder ${SERVER_PATH} ${SERVER_PATH}
COPY --from=builder ${STATIC_CODEGEN_PATH} ${STATIC_CODEGEN_PATH}
COPY --from=builder ${PACKAGE_JSON_PATH} ${PACKAGE_JSON_PATH}
RUN npm install --only=prod

EXPOSE 8080
CMD node server/start.js
