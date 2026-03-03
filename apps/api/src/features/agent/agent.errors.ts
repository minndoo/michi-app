export class AgentInfrastructureError extends Error {
  constructor(message = "Agent service temporarily unavailable") {
    super(message);
    this.name = "AgentInfrastructureError";
  }
}

export class AgentJobNotFoundError extends Error {
  constructor(message = "Agent job was not found") {
    super(message);
    this.name = "AgentJobNotFoundError";
  }
}
