// =============================================================================
// ENUMS — mirror Postgres enums exactly so frontend & API stay in sync
// =============================================================================

export type ElectionStatus = 'draft' | 'scheduled' | 'open' | 'closed' | 'archived';

export type AnonymityMode = 'anonymous' | 'hybrid' | 'transparent';

export type ResultVisibility = 'realtime' | 'after_close' | 'manual' | 'admin_only';

export type VotingMethod = 'single' | 'multiple' | 'ranked' | 'weighted' | 'referendum' | 'score';

export type OrgRole = 'super_admin' | 'org_admin' | 'election_officer' | 'observer' | 'voter';

// =============================================================================
// CORE ENTITIES
// =============================================================================

export interface Organization {
    id: string;
    name: string;
    slug: string;
    created_at: string;
    updated_at: string;
}

export interface Profile {
    user_id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    created_at: string;
    updated_at: string;
}

export interface OrgMember {
    id: string;
    org_id: string;
    user_id: string;
    role: OrgRole;
    membership_id: string | null;
    branch_id: string | null;
    department: string | null;
    shareholder_weight: number;
    is_active: boolean;
    created_at: string;
}

// =============================================================================
// ELECTIONS
// =============================================================================

export interface Election {
    id: string;
    org_id: string;
    title: string;
    description: string | null;
    status: ElectionStatus;
    voting_method: VotingMethod;
    anonymity: AnonymityMode;
    result_visibility: ResultVisibility;
    start_at: string | null;
    end_at: string | null;
    allow_proxy: boolean;
    quorum_percentage: number | null;
    quorum_min_votes: number | null;
    approval_threshold: number;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface Position {
    id: string;
    election_id: string;
    org_id: string;
    title: string;
    description: string | null;
    max_selections: number;
    sort_order: number;
    created_at: string;
}

export interface Candidate {
    id: string;
    election_id: string;
    position_id: string;
    org_id: string;
    full_name: string;
    manifesto: string | null;
    photo_path: string | null;
    photo_url?: string; // signed URL resolved by API
    approved: boolean;
    created_at: string;
}

// =============================================================================
// VOTER REGISTRY
// =============================================================================

export interface VoterRegistry {
    id: string;
    org_id: string;
    election_id: string;
    user_id: string | null;
    email: string | null;
    phone: string | null;
    external_voter_id: string | null;
    branch_id: string | null;
    department: string | null;
    is_eligible: boolean;
    invited_at: string | null;
    unique_token: string | null;
    created_at: string;
}

export interface Proxy {
    id: string;
    org_id: string;
    election_id: string;
    principal_registry_id: string;
    proxy_registry_id: string;
    created_by: string | null;
    created_at: string;
}

// =============================================================================
// VOTING
// =============================================================================

export interface BallotSelection {
    position_id: string;
    candidate_id?: string | null;
    rank?: number | null;
    score?: number | null;
}

export interface CastVoteRequest {
    selections: BallotSelection[];
    receipt_nonce: string;
    device_hash?: string;
    encrypted_payload_b64?: string; // client-provided, optional
}

export interface CastVoteResponse {
    receipt_code: string;
    vote_id: string;
    submitted_at: string;
}

// =============================================================================
// BALLOTS (for rendering)
// =============================================================================

export interface BallotPosition {
    id: string;
    title: string;
    description: string | null;
    max_selections: number;
    sort_order: number;
    candidates: Pick<Candidate, 'id' | 'full_name' | 'manifesto' | 'photo_url'>[];
}

export interface Ballot {
    election: Election;
    positions: BallotPosition[];
    voter_has_voted: boolean;
}

// =============================================================================
// RESULTS
// =============================================================================

export interface CandidateResult {
    candidate_id: string;
    full_name: string;
    vote_count: number;
    weighted_count: number;
    percentage: number;
    rank?: number;
}

export interface PositionResult {
    position_id: string;
    title: string;
    candidates: CandidateResult[];
    total_votes: number;
}

export interface ElectionResults {
    election_id: string;
    election_title: string;
    computed_at: string;
    total_voters_eligible: number;
    total_votes_cast: number;
    turnout_percentage: number;
    quorum_met: boolean;
    positions: PositionResult[];
}

// =============================================================================
// AUDIT
// =============================================================================

export interface AuditLog {
    id: string;
    org_id: string | null;
    actor_user_id: string | null;
    action: string;
    entity_type: string | null;
    entity_id: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
}

// =============================================================================
// API RESPONSES
// =============================================================================

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
}

export interface ApiError {
    error: string;
    message: string;
    details?: Record<string, unknown>;
}
