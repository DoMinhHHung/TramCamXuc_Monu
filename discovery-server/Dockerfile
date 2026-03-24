FROM eclipse-temurin:17-jdk-alpine AS build

WORKDIR /app

COPY .mvn/ .mvn/
COPY mvnw mvnw
RUN chmod +x mvnw

COPY pom.xml pom.xml
COPY src src

RUN ./mvnw package -Dmaven.test.skip=true -B --no-transfer-progress

FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=build /app/target/*.jar app.jar

RUN chown appuser:appgroup app.jar

USER appuser

EXPOSE 8761

ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-XX:+ExitOnOutOfMemoryError", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]