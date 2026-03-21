# ════════════════════════════════════════════════════════════════
# Stage 1: Build
# ════════════════════════════════════════════════════════════════
FROM eclipse-temurin:17-jdk-alpine AS build

WORKDIR /app

COPY .mvn/ .mvn/
COPY mvnw mvnw
RUN chmod +x mvnw

# Root pom + TẤT CẢ module pom.xml
COPY pom.xml pom.xml
COPY discovery-server/pom.xml discovery-server/pom.xml
COPY api-gateway/pom.xml api-gateway/pom.xml
COPY identity-service/pom.xml identity-service/pom.xml
COPY integration-service/pom.xml integration-service/pom.xml
COPY music-service/pom.xml music-service/pom.xml
COPY payment-service/pom.xml payment-service/pom.xml
COPY transcode-service/pom.xml transcode-service/pom.xml
COPY social-service/pom.xml social-service/pom.xml
COPY ads-service/pom.xml ads-service/pom.xml
COPY recommendation-service/pom.xml recommendation-service/pom.xml

COPY transcode-service/src transcode-service/src

# -Dmaven.test.skip=true: skip HOÀN TOÀN test (không load surefire plugin)
RUN ./mvnw package -Dmaven.test.skip=true -B --no-transfer-progress \
    -pl transcode-service -am \
    -Dmaven.wagon.http.retryHandler.count=3 \
    -Dmaven.wagon.httpconnectionManager.ttlSeconds=25

# ════════════════════════════════════════════════════════════════
# Stage 2: Runtime
# ════════════════════════════════════════════════════════════════
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

RUN apk add --no-cache ffmpeg

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=build /app/transcode-service/target/*.jar app.jar

RUN chown appuser:appgroup app.jar

USER appuser

EXPOSE 8766

ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-XX:+ExitOnOutOfMemoryError", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]