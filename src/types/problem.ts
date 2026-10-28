export interface Problem {
    id: number
    description: string
    status: "open" | "in_progress" | "resolved" | "closed"
    reporter_id: number
    assignee_id?: number
    created_at: string
    updated_at: string
    reporter?: {
        id: number
        first_name: string
        last_name: string
    }
    assignee?: {
        id: number
        first_name: string
        last_name: string
    }
}

export interface CreateProblemData {
    description: string
    reporter_id: number
    status: string
}

export interface UpdateProblemStatusData {
    status: "open" | "in_progress" | "resolved" | "closed"
}

export interface AssignProblemData {
    assignee_id: number
}

export interface ProblemResponse {
    success: boolean
    data: Problem[]
    message: string
    code: number
    meta?: {
        current_page: number
        from: number
        last_page: number
        path: string
        per_page: number
        to: number
        total: number
    }
}

export interface SingleProblemResponse {
    success: boolean
    data: Problem
    message: string
    code: number
}
