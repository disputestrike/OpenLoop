/**
 * UNIT TESTS: Input Validation
 * Tests all validation schemas
 * 
 * Run: npm test -- __tests__/unit/input-validation.test.ts
 */

import {
  validateHireRequest,
  validateCommentRequest,
  validateReviewRequest,
  validateVoteRequest,
  validateLoopCreateRequest,
  validateProfileUpdateRequest,
} from "@/lib/input-validation";

describe("Input Validation", () => {
  describe("validateHireRequest", () => {
    it("should accept valid hire request", () => {
      const result = validateHireRequest({
        agentLoopTag: "Sam_Trader",
        taskDescription: "Please negotiate my internet bill down from $99 to $50",
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        agentLoopTag: "Sam_Trader",
        taskDescription: "Please negotiate my internet bill down from $99 to $50",
      });
      expect(result.errors).toBeUndefined();
    });

    it("should reject missing agentLoopTag", () => {
      const result = validateHireRequest({
        taskDescription: "Some task",
      });

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0].field).toBe("agentLoopTag");
    });

    it("should reject invalid agentLoopTag format", () => {
      const result = validateHireRequest({
        agentLoopTag: "Invalid Tag!@#",
        taskDescription: "Some task here",
      });

      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.field === "agentLoopTag")).toBe(true);
    });

    it("should reject short taskDescription", () => {
      const result = validateHireRequest({
        agentLoopTag: "Sam_Trader",
        taskDescription: "Too short",
      });

      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.field === "taskDescription")).toBe(true);
    });

    it("should reject too long taskDescription", () => {
      const result = validateHireRequest({
        agentLoopTag: "Sam_Trader",
        taskDescription: "x".repeat(2001),
      });

      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.field === "taskDescription")).toBe(true);
    });
  });

  describe("validateCommentRequest", () => {
    it("should accept valid comment", () => {
      const result = validateCommentRequest({
        body: "Great post! Very helpful insights.",
      });

      expect(result.success).toBe(true);
      expect(result.data?.body).toBe("Great post! Very helpful insights.");
    });

    it("should reject empty comment", () => {
      const result = validateCommentRequest({
        body: "",
      });

      expect(result.success).toBe(false);
    });

    it("should reject comment without body field", () => {
      const result = validateCommentRequest({});

      expect(result.success).toBe(false);
    });

    it("should reject too long comment", () => {
      const result = validateCommentRequest({
        body: "x".repeat(2001),
      });

      expect(result.success).toBe(false);
    });

    it("should trim whitespace", () => {
      const result = validateCommentRequest({
        body: "  Hello world  ",
      });

      expect(result.success).toBe(true);
      expect(result.data?.body).toBe("Hello world");
    });
  });

  describe("validateReviewRequest", () => {
    it("should accept valid review", () => {
      const result = validateReviewRequest({
        agentLoopTag: "Sam_Trader",
        rating: 5,
        comment: "Excellent service!",
      });

      expect(result.success).toBe(true);
      expect(result.data?.rating).toBe(5);
    });

    it("should accept review without comment", () => {
      const result = validateReviewRequest({
        agentLoopTag: "Sam_Trader",
        rating: 4,
      });

      expect(result.success).toBe(true);
    });

    it("should reject invalid rating (not 1-5)", () => {
      const result = validateReviewRequest({
        agentLoopTag: "Sam_Trader",
        rating: 10,
      });

      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.field === "rating")).toBe(true);
    });

    it("should reject non-integer rating", () => {
      const result = validateReviewRequest({
        agentLoopTag: "Sam_Trader",
        rating: 4.5,
      });

      expect(result.success).toBe(false);
    });

    it("should reject missing agentLoopTag", () => {
      const result = validateReviewRequest({
        rating: 5,
      });

      expect(result.success).toBe(false);
    });
  });

  describe("validateVoteRequest", () => {
    it("should accept up vote", () => {
      const result = validateVoteRequest({ vote: "up" });

      expect(result.success).toBe(true);
      expect(result.data?.vote).toBe("up");
    });

    it("should accept down vote", () => {
      const result = validateVoteRequest({ vote: "down" });

      expect(result.success).toBe(true);
      expect(result.data?.vote).toBe("down");
    });

    it("should reject invalid vote", () => {
      const result = validateVoteRequest({ vote: "sideways" });

      expect(result.success).toBe(false);
    });
  });

  describe("validateLoopCreateRequest", () => {
    it("should accept empty request (all optional)", () => {
      const result = validateLoopCreateRequest({});

      expect(result.success).toBe(true);
    });

    it("should accept valid loopTag", () => {
      const result = validateLoopCreateRequest({
        loopTag: "My_Loop-123",
      });

      expect(result.success).toBe(true);
    });

    it("should reject invalid loopTag format", () => {
      const result = validateLoopCreateRequest({
        loopTag: "Invalid Tag!",
      });

      expect(result.success).toBe(false);
    });

    it("should accept valid email", () => {
      const result = validateLoopCreateRequest({
        email: "user@example.com",
      });

      expect(result.success).toBe(true);
    });

    it("should reject invalid email", () => {
      const result = validateLoopCreateRequest({
        email: "not-an-email",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("validateProfileUpdateRequest", () => {
    it("should accept empty request (all optional)", () => {
      const result = validateProfileUpdateRequest({});

      expect(result.success).toBe(true);
    });

    it("should accept persona update", () => {
      const result = validateProfileUpdateRequest({
        persona: "Finance Expert",
      });

      expect(result.success).toBe(true);
    });

    it("should reject too long persona", () => {
      const result = validateProfileUpdateRequest({
        persona: "x".repeat(256),
      });

      expect(result.success).toBe(false);
    });

    it("should accept all valid fields", () => {
      const result = validateProfileUpdateRequest({
        persona: "Finance Expert",
        publicDescription: "I help negotiate bills",
        agentBio: "Specialized in financial negotiations",
        businessCategory: "Finance",
      });

      expect(result.success).toBe(true);
      expect(result.data?.persona).toBe("Finance Expert");
    });
  });
});
