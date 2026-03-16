/**
 * INPUT VALIDATION LAYER
 * Comprehensive validation for all POST endpoints
 * Uses Zod for runtime type safety without external dependency requirement
 * Fallback: Basic validation if Zod not available
 */

// ─── VALIDATION ERROR TYPES ───────────────────────────────────────────
export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

// ─── HIRE VALIDATION ──────────────────────────────────────────────────
export interface HireRequest {
  agentLoopTag: string;
  taskDescription: string;
}

export function validateHireRequest(data: unknown): ValidationResult<HireRequest> {
  const errors: ValidationError[] = [];

  if (!data || typeof data !== 'object') {
    return {
      success: false,
      errors: [{ field: 'body', message: 'Request body must be a JSON object' }],
    };
  }

  const body = data as Record<string, unknown>;

  // Validate agentLoopTag
  if (!body.agentLoopTag) {
    errors.push({ field: 'agentLoopTag', message: 'Agent tag is required' });
  } else if (typeof body.agentLoopTag !== 'string') {
    errors.push({ field: 'agentLoopTag', message: 'Agent tag must be a string' });
  } else if (body.agentLoopTag.length < 1) {
    errors.push({ field: 'agentLoopTag', message: 'Agent tag cannot be empty' });
  } else if (body.agentLoopTag.length > 50) {
    errors.push({ field: 'agentLoopTag', message: 'Agent tag cannot exceed 50 characters' });
  } else if (!/^[a-zA-Z0-9_-]+$/.test(body.agentLoopTag)) {
    errors.push({ field: 'agentLoopTag', message: 'Agent tag can only contain letters, numbers, dash, and underscore' });
  }

  // Validate taskDescription
  if (!body.taskDescription) {
    errors.push({ field: 'taskDescription', message: 'Task description is required' });
  } else if (typeof body.taskDescription !== 'string') {
    errors.push({ field: 'taskDescription', message: 'Task description must be a string' });
  } else if (body.taskDescription.trim().length < 10) {
    errors.push({ field: 'taskDescription', message: 'Task description must be at least 10 characters' });
  } else if (body.taskDescription.length > 2000) {
    errors.push({ field: 'taskDescription', message: 'Task description cannot exceed 2000 characters' });
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      agentLoopTag: body.agentLoopTag as string,
      taskDescription: (body.taskDescription as string).trim(),
    },
  };
}

// ─── COMMENT VALIDATION ───────────────────────────────────────────────
export interface CommentRequest {
  body: string;
}

export function validateCommentRequest(data: unknown): ValidationResult<CommentRequest> {
  const errors: ValidationError[] = [];

  if (!data || typeof data !== 'object') {
    return {
      success: false,
      errors: [{ field: 'body', message: 'Request body must be a JSON object' }],
    };
  }

  const body = data as Record<string, unknown>;

  if (!body.body) {
    errors.push({ field: 'body', message: 'Comment body is required' });
  } else if (typeof body.body !== 'string') {
    errors.push({ field: 'body', message: 'Comment body must be a string' });
  } else if (body.body.trim().length === 0) {
    errors.push({ field: 'body', message: 'Comment cannot be empty' });
  } else if (body.body.length > 2000) {
    errors.push({ field: 'body', message: 'Comment cannot exceed 2000 characters' });
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      body: (body.body as string).trim(),
    },
  };
}

// ─── REVIEW VALIDATION ────────────────────────────────────────────────
export interface ReviewRequest {
  agentLoopTag: string;
  rating: number;
  comment?: string;
}

export function validateReviewRequest(data: unknown): ValidationResult<ReviewRequest> {
  const errors: ValidationError[] = [];

  if (!data || typeof data !== 'object') {
    return {
      success: false,
      errors: [{ field: 'body', message: 'Request body must be a JSON object' }],
    };
  }

  const body = data as Record<string, unknown>;

  // Validate agentLoopTag
  if (!body.agentLoopTag) {
    errors.push({ field: 'agentLoopTag', message: 'Agent tag is required' });
  } else if (typeof body.agentLoopTag !== 'string' || body.agentLoopTag.length === 0) {
    errors.push({ field: 'agentLoopTag', message: 'Agent tag must be a non-empty string' });
  }

  // Validate rating
  if (body.rating === undefined || body.rating === null) {
    errors.push({ field: 'rating', message: 'Rating is required' });
  } else if (typeof body.rating !== 'number') {
    errors.push({ field: 'rating', message: 'Rating must be a number' });
  } else if (!Number.isInteger(body.rating)) {
    errors.push({ field: 'rating', message: 'Rating must be an integer' });
  } else if (body.rating < 1 || body.rating > 5) {
    errors.push({ field: 'rating', message: 'Rating must be between 1 and 5' });
  }

  // Validate optional comment
  if (body.comment !== undefined && body.comment !== null) {
    if (typeof body.comment !== 'string') {
      errors.push({ field: 'comment', message: 'Comment must be a string' });
    } else if (body.comment.length > 500) {
      errors.push({ field: 'comment', message: 'Comment cannot exceed 500 characters' });
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      agentLoopTag: body.agentLoopTag as string,
      rating: body.rating as number,
      comment: body.comment ? (body.comment as string).trim() : undefined,
    },
  };
}

// ─── VOTE VALIDATION ──────────────────────────────────────────────────
export interface VoteRequest {
  vote: 'up' | 'down';
}

export function validateVoteRequest(data: unknown): ValidationResult<VoteRequest> {
  const errors: ValidationError[] = [];

  if (!data || typeof data !== 'object') {
    return {
      success: false,
      errors: [{ field: 'body', message: 'Request body must be a JSON object' }],
    };
  }

  const body = data as Record<string, unknown>;

  if (!body.vote) {
    errors.push({ field: 'vote', message: 'Vote is required' });
  } else if (body.vote !== 'up' && body.vote !== 'down') {
    errors.push({ field: 'vote', message: 'Vote must be "up" or "down"' });
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      vote: body.vote as 'up' | 'down',
    },
  };
}

// ─── LOOP CREATION VALIDATION ─────────────────────────────────────────
export interface LoopCreateRequest {
  loopTag?: string;
  email?: string;
}

export function validateLoopCreateRequest(data: unknown): ValidationResult<LoopCreateRequest> {
  const errors: ValidationError[] = [];

  if (data && typeof data === 'object') {
    const body = data as Record<string, unknown>;

    // Validate optional loopTag
    if (body.loopTag !== undefined && body.loopTag !== null) {
      if (typeof body.loopTag !== 'string') {
        errors.push({ field: 'loopTag', message: 'Loop tag must be a string' });
      } else if (body.loopTag.length < 2) {
        errors.push({ field: 'loopTag', message: 'Loop tag must be at least 2 characters' });
      } else if (body.loopTag.length > 30) {
        errors.push({ field: 'loopTag', message: 'Loop tag cannot exceed 30 characters' });
      } else if (!/^[a-zA-Z0-9_-]+$/.test(body.loopTag)) {
        errors.push({ field: 'loopTag', message: 'Loop tag can only contain letters, numbers, dash, and underscore' });
      }
    }

    // Validate optional email
    if (body.email !== undefined && body.email !== null) {
      if (typeof body.email !== 'string') {
        errors.push({ field: 'email', message: 'Email must be a string' });
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
        errors.push({ field: 'email', message: 'Invalid email format' });
      }
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      loopTag: data && typeof data === 'object' && (data as Record<string, unknown>).loopTag ? ((data as Record<string, unknown>).loopTag as string) : undefined,
      email: data && typeof data === 'object' && (data as Record<string, unknown>).email ? ((data as Record<string, unknown>).email as string) : undefined,
    },
  };
}

// ─── PROFILE UPDATE VALIDATION ────────────────────────────────────────
export interface ProfileUpdateRequest {
  persona?: string;
  publicDescription?: string;
  agentBio?: string;
  businessCategory?: string;
}

export function validateProfileUpdateRequest(data: unknown): ValidationResult<ProfileUpdateRequest> {
  const errors: ValidationError[] = [];

  if (data && typeof data === 'object') {
    const body = data as Record<string, unknown>;

    if (body.persona !== undefined && body.persona !== null) {
      if (typeof body.persona !== 'string') {
        errors.push({ field: 'persona', message: 'Persona must be a string' });
      } else if (body.persona.length > 255) {
        errors.push({ field: 'persona', message: 'Persona cannot exceed 255 characters' });
      }
    }

    if (body.publicDescription !== undefined && body.publicDescription !== null) {
      if (typeof body.publicDescription !== 'string') {
        errors.push({ field: 'publicDescription', message: 'Description must be a string' });
      } else if (body.publicDescription.length > 500) {
        errors.push({ field: 'publicDescription', message: 'Description cannot exceed 500 characters' });
      }
    }

    if (body.agentBio !== undefined && body.agentBio !== null) {
      if (typeof body.agentBio !== 'string') {
        errors.push({ field: 'agentBio', message: 'Bio must be a string' });
      } else if (body.agentBio.length > 1000) {
        errors.push({ field: 'agentBio', message: 'Bio cannot exceed 1000 characters' });
      }
    }

    if (body.businessCategory !== undefined && body.businessCategory !== null) {
      if (typeof body.businessCategory !== 'string') {
        errors.push({ field: 'businessCategory', message: 'Category must be a string' });
      } else if (body.businessCategory.length > 100) {
        errors.push({ field: 'businessCategory', message: 'Category cannot exceed 100 characters' });
      }
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      persona: data && typeof data === 'object' && (data as Record<string, unknown>).persona ? ((data as Record<string, unknown>).persona as string) : undefined,
      publicDescription: data && typeof data === 'object' && (data as Record<string, unknown>).publicDescription ? ((data as Record<string, unknown>).publicDescription as string) : undefined,
      agentBio: data && typeof data === 'object' && (data as Record<string, unknown>).agentBio ? ((data as Record<string, unknown>).agentBio as string) : undefined,
      businessCategory: data && typeof data === 'object' && (data as Record<string, unknown>).businessCategory ? ((data as Record<string, unknown>).businessCategory as string) : undefined,
    },
  };
}

// ─── HELPER: Format validation errors for response ────────────────────
export function formatValidationErrorResponse(errors: ValidationError[]) {
  return {
    error: 'Validation failed',
    details: errors.map(e => `${e.field}: ${e.message}`).join('; '),
    errors,
  };
}
