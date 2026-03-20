# ════════════════════════════════════════════════════════════════
# Stage 1: Build
# ════════════════════════════════════════════════════════════════
FROM eclipse-temurin:17-jdk-alpine AS build

WORKDIR /app

COPY .mvn/ .mvn/
COPY mvnw pom.xml ./

RUN chmod +x mvnw
RUN ./mvnw dependency:go-offline -B --no-transfer-progress

COPY src/ src/
RUN ./mvnw package -DskipTests -B --no-transfer-progress


# ════════════════════════════════════════════════════════════════
# Stage 2: Runtime
# ════════════════════════════════════════════════════════════════
FROM eclipse-temurin:17-jre-alpine

RUN apk add --no-cache ffmpeg

RUN ffmpeg -version && ffprobe -version

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=build /app/target/*.jar app.jar

RUN chown appuser:appgroup app.jar

USER appuser

EXPOSE 8766

ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-XX:+ExitOnOutOfMemoryError", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]