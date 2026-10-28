// Company Types
export interface Company {
  id: number
  uuid: string
  name: string
  tin: string
  address: string
  phoneNumber: string
  email?: string
  smsSender?: string
  senderID?: string
  website?: string
  helpDeskPhoneNumber?: string
  logoUrl?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  // Statistics
  totalVehicles?: number
  totalAgents?: number
  totalUsers?: number
  totalParcels?: number
  totalRevenue?: number
  activeVehicles?: number
  inactiveVehicles?: number
}

// Company Agent
export interface CompanyAgent {
  id: number
  username: string
  email: string
  phoneNumber: string
  isActive: boolean
}

// Company Vehicle with Model
export interface CompanyVehicle {
  id: number
  plateNumber: string
  model: {
    id: number
    uuid: string
    name: string
    createdAt: string
    updatedAt: string
  }
  capacity: number
  isActive: boolean
}

// Create Company Data - matches API request body
export interface CreateCompanyData {
  name: string
  tin: string
  phoneNumber: string
  address: string
  email?: string
  smsSender?: string
  senderID?: string
  website?: string
  helpDeskPhoneNumber?: string
  logoUrl?: string
}

// Update Company Data
export interface UpdateCompanyData {
  name?: string
  phoneNumber?: string
  address?: string
  email?: string
  smsSender?: string
  senderID?: string
  website?: string
  helpDeskPhoneNumber?: string
  logoUrl?: string
  isActive?: boolean
}

// Pagination
export interface Pagination {
  currentPage: number
  totalPages: number
  totalItems: number
  perPage: number
}

// Company Stats
export interface CompanyStats {
  totalParcels: number
  totalParcelPrice: number
  total?: number
  active?: number
  inactive?: number
  totalVehicles?: number
  totalAgents?: number
  activeVehicles?: number
  activeAgents?: number
  totalRevenue?: number
}

// Company List Response
export interface CompanyListResponse {
  companies: Company[]
  pagination: Pagination
}

// Company Agents Response
export interface CompanyAgentsResponse {
  agents: CompanyAgent[]
  pagination: Pagination
}

// Company Trip Agents Response
export interface CompanyTripAgentsResponse {
  tripAgents: CompanyAgent[]
  pagination: Pagination
}

// Company Vehicles Response
export interface CompanyVehiclesResponse {
  vehicles: CompanyVehicle[]
  pagination: Pagination
}

// Company Query Params
export interface CompanyQueryParams {
  page?: number
  per_page?: number
  name?: string
  is_active?: boolean
  include_relations?: boolean
}
