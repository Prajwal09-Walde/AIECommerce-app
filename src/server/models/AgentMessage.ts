import mongoose, { Schema, model, models } from "mongoose";

const AgentMessageSchema = new Schema(
  {
    sessionId: { type: String, required: true, index: true },
    role: {
      type: String,
      enum: ["user", "agent", "tool"],
      required: true,
    },
    content: { type: String, required: true },
    toolName: { type: String },
    toolResult: { type: Schema.Types.Mixed },
    agentType: {
      type: String,
      enum: ["analytics", "alert", "pricing", "manager"],
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Compound index for efficient session lookups
AgentMessageSchema.index({ sessionId: 1, createdAt: 1 });

const AgentMessage =
  models.AgentMessage || model("AgentMessage", AgentMessageSchema);

export default AgentMessage;
