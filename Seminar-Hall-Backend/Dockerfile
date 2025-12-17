# -----------------------------------------------------------
# Stage 1 — Build using Eclipse Temurin JDK 21 + Maven
# -----------------------------------------------------------
FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace

# Install Maven
RUN apt-get update && apt-get install -y maven && rm -rf /var/lib/apt/lists/*

# Copy Maven project files
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source and build
COPY src ./src
RUN mvn clean package -DskipTests

# -----------------------------------------------------------
# Stage 2 — Lightweight runtime image
# -----------------------------------------------------------
FROM eclipse-temurin:21-jre
WORKDIR /app

# Copy built JAR from builder stage
COPY --from=build /workspace/target/*.jar app.jar

# Expose default port
EXPOSE 8080

# JVM options for production
ENV JAVA_OPTS="-Xms512m -Xmx1g"

# Run the app
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -Dspring.profiles.active=default -jar /app/app.jar"]
