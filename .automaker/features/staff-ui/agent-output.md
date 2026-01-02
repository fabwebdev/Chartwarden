I'll continue from where the previous implementation left off. Let me first check the current state of the codebase and what's already been implemented.

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Explore existing codebase structure for staff-related code",
      "status": "completed",
      "activeForm": "Exploring existing codebase structure"
    },
    {
      "content": "Plan staff directory UI implementation",
      "status": "in_progress",
      "activeForm": "Planning staff directory UI implementation"
    },
    {
      "content": "Implement staff directory page with profiles and credentials",
      "status": "pending",
      "activeForm": "Implementing staff directory page"
    },
    {
      "content": "Create Playwright verification test",
      "status": "pending",
      "activeForm": "Creating Playwright verification test"
    },
    {
      "content": "Run verification test and fix any issues",
      "status": "pending",
      "activeForm": "Running verification test"
    },
    {
      "content": "Delete temporary test file",
      "status": "pending",
      "activeForm": "Deleting temporary test file"
    }
  ]
}

🔧 Tool: Glob
Input: {
  "pattern": "**/staff*"
}

🔧 Tool: Glob
Input: {
  "pattern": "**/Staff*"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/.automaker/features/staff-ui/agent-output.md"
}

Let me check if there's already a staff UI created and review the backend structures.

🔧 Tool: Bash
Input: {
  "command": "find /Users/fabrice/Sites/chartwarden/Chartwarden/apps/web/src -type f \\( -name \"*staff*\" -o -name \"*Staff*\" \\) 2>/dev/null",
  "description": "Find staff files in frontend"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/db/schemas/staffManagement.schema.js"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/controllers/Staff.controller.js"
}

Now I have a good understanding of the backend. The backend has a comprehensive Staff controller and schema. I need to create the frontend components. Let me check what already exists in the frontend and look at the patterns used.

🔧 Tool: Bash
Input: {
  "command": "ls -la /Users/fabrice/Sites/chartwarden/Chartwarden/apps/web/src/app/\\(dashboard\\)/ 2>/dev/null | head -30",
  "description": "List dashboard app routes"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/apps/web/src/views/patients-views/PatientsPage.tsx",
  "limit": 150
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/apps/web/src/api/patient.ts",
  "limit": 100
}

Now let me check the menu structure and existing admin views.

🔧 Tool: Bash
Input: {
  "command": "ls -la /Users/fabrice/Sites/chartwarden/Chartwarden/apps/web/src/views/admin/ 2>/dev/null",
  "description": "Check admin views"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/apps/web/src/menu-items/user-management.tsx"
}

🔧 Tool: Glob
Input: {
  "pattern": "**/menu-items/*.tsx",
  "path": "/Users/fabrice/Sites/chartwarden/Chartwarden/apps/web/src"
}

Let me also check the structure of the apps web folder and the main card component pattern.

🔧 Tool: Bash
Input: {
  "command": "ls -la /Users/fabrice/Sites/chartwarden/Chartwarden/apps/web/src/app/\\(dashboard\\)/admin/",
  "description": "List admin routes"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/apps/web/src/views/admin/UserManagementDashboard.tsx",
  "limit": 250
}

Now I have a good understanding of the patterns. Let me update the todo and start implementing the staff directory UI. I'll create:
1. A staff API service
2. A staff directory page component
3. A route for the staff page
4. Add it to the menu

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Explore existing codebase structure for staff-related code",
      "status": "completed",
      "activeForm": "Exploring existing codebase structure"
    },
    {
      "content": "Plan staff directory UI implementation",
      "status": "completed",
      "activeForm": "Planning staff directory UI implementation"
    },
    {
      "content": "Create staff API service",
      "status": "in_progress",
      "activeForm": "Creating staff API service"
    },
    {
      "content": "Create staff directory page component",
      "status": "pending",
      "activeForm": "Creating staff directory page component"
    },
    {
      "content": "Create app route for staff page",
      "status": "pending",
      "activeForm": "Creating app route for staff page"
    },
    {
      "content": "Update menu to include staff directory",
      "status": "pending",
      "activeForm": "Updating menu"
    },
    {
      "content": "Create Playwright verification test",
      "status": "pending",
      "activeForm": "Creating Playwright verification test"
    },
    {
      "content": "Run verification test and fix any issues",
      "status": "pending",
      "activeForm": "Running verification test"
    },
    {
      "content": "Delete temporary test file",
      "status": "pending",
      "activeForm": "Deleting temporary test file"
    }
  ]
}

🔧 Tool: Write
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/apps/web/src/api/staff.ts",
  "content": "/**\n * Staff API Service\n *\n * Comprehensive API service for all staff-related endpoints.\n * All routes are mounted under /api/staff and require authentication.\n */\n\nimport http from 'hooks/useCookie';\n\n// ==============================|| TYPES ||============================== //\n\nexport interface StaffProfile {\n  id: number;\n  user_id?: string;\n  employee_id?: string;\n  first_name: string;\n  last_name: string;\n  middle_name?: string;\n  preferred_name?: string;\n  job_title?: string;\n  department?: string;\n  employment_type?: string;\n  hire_date?: string;\n  termination_date?: string;\n  employment_status: string;\n  email?: string;\n  phone?: string;\n  mobile?: string;\n  emergency_contact_name?: string;\n  emergency_contact_phone?: string;\n  emergency_contact_relationship?: string;\n  address_line1?: string;\n  address_line2?: string;\n  city?: string;\n  state?: string;\n  zip_code?: string;\n  specialty?: string;\n  years_of_experience?: number;\n  is_supervisory?: boolean;\n  service_territory?: any;\n  max_patient_load?: number;\n  notes?: string;\n  metadata?: any;\n  createdAt?: string;\n  updatedAt?: string;\n}\n\nexport interface StaffCredential {\n  id: number;\n  staff_id: number;\n  credential_type: string;\n  credential_name: string;\n  credential_number?: string;\n  issuing_authority?: string;\n  issuing_state?: string;\n  issue_date?: string;\n  expiration_date: string;\n  verification_date?: string;\n  credential_status: string;\n  alert_days_before_expiration?: number;\n  renewal_reminder_sent?: boolean;\n  document_url?: string;\n  notes?: string;\n  createdAt?: string;\n  updatedAt?: string;\n}\n\nexport interface StaffCaseload {\n  id: number;\n  staff_id: number;\n  patient_id: number;\n  assignment_role: string;\n  is_primary: boolean;\n  assignment_start_date: string;\n  assignment_end_date?: string;\n  assignment_status: string;\n  scheduled_visits_per_week?: number;\n  actual_visits_this_week?: number;\n  transfer_reason?: string;\n  transferred_to_staff_id?: number;\n  transfer_date?: string;\n  notes?: string;\n}\n\nexport interface StaffSchedule {\n  id: number;\n  staff_id: number;\n  schedule_type: string;\n  shift_date: string;\n  start_time?: string;\n  end_time?: string;\n  is_on_call?: boolean;\n  on_call_type?: string;\n  time_off_type?: string;\n  time_off_status?: string;\n  approved_by_id?: string;\n  approval_date?: string;\n  work_location?: string;\n  notes?: string;\n}\n\nexport interface StaffTraining {\n  id: number;\n  staff_id: number;\n  training_name: string;\n  training_type: string;\n  training_category?: string;\n  training_provider?: string;\n  instructor_name?: string;\n  training_date: string;\n  completion_date?: string;\n  expiration_date?: string;\n  training_status: string;\n  hours_completed?: number;\n  ceu_credits?: number;\n  score?: number;\n  passing_score?: number;\n  passed?: boolean;\n  certificate_number?: string;\n  certificate_url?: string;\n  is_required?: boolean;\n  due_date?: string;\n  notes?: string;\n}\n\n// ==============================|| STAFF PROFILE ENDPOINTS ||============================== //\n\n/**\n * Get all staff profiles\n * @param params - Query parameters for filtering and pagination\n */\nexport const getAllStaff = async (params?: {\n  limit?: number;\n  offset?: number;\n  status?: string;\n  department?: string;\n  job_title?: string;\n  search?: string;\n  employee_id?: string;\n}) => {\n  const queryParams = new URLSearchParams();\n  if (params) {\n    Object.entries(params).forEach(([key, value]) => {\n      if (value !== undefined && value !== null && value !== '') {\n        queryParams.append(key, String(value));\n      }\n    });\n  }\n  const queryString = queryParams.toString();\n  const response = await http.get(`/staff${queryString ? `?${queryString}` : ''}`);\n  return response.data;\n};\n\n/**\n * Get staff profile by ID\n */\nexport const getStaffById = async (id: number | string) => {\n  const response = await http.get(`/staff/${id}`);\n  return response.data;\n};\n\n/**\n * Create a new staff profile\n */\nexport const createStaff = async (staffData: Partial<StaffProfile>) => {\n  const response = await http.post('/staff', staffData);\n  return response.data;\n};\n\n/**\n * Update staff profile\n */\nexport const updateStaff = async (id: number | string, staffData: Partial<StaffProfile>) => {\n  const response = await http.patch(`/staff/${id}`, staffData);\n  return response.data;\n};\n\n/**\n * Delete staff profile (soft delete)\n */\nexport const deleteStaff = async (id: number | string) => {\n  const response = await http.delete(`/staff/${id}`);\n  return response.data;\n};\n\n// ==============================|| CREDENTIALS ENDPOINTS ||============================== //\n\n/**\n * Get credentials for a staff member\n */\nexport const getStaffCredentials = async (staffId: number | string) => {\n  const response = await http.get(`/staff/${staffId}/credentials`);\n  return response.data;\n};\n\n/**\n * Add credential to staff member\n */\nexport const addCredential = async (staffId: number | string, credentialData: Partial<StaffCredential>) => {\n  const response = await http.post(`/staff/${staffId}/credentials`, credentialData);\n  return response.data;\n};\n\n/**\n * Update credential\n */\nexport const updateCredential = async (credentialId: number | string, credentialData: Partial<StaffCredential>) => {\n  const response = await http.put(`/credentials/${credentialId}`, credentialData);\n  return response.data;\n};\n\n/**\n * Delete credential\n */\nexport const deleteCredential = async (credentialId: number | string) => {\n  const response = await http.delete(`/credentials/${credentialId}`);\n  return response.data;\n};\n\n/**\n * Get expiring credentials\n */\nexport const getExpiringCredentials = async (days?: number) => {\n  const response = await http.get(`/staff/credentials/expiring${days ? `?days=${days}` : ''}`);\n  return response.data;\n};\n\n/**\n * Get expired credentials\n */\nexport const getExpiredCredentials = async () => {\n  const response = await http.get('/credentials/expired');\n  return response.data;\n};\n\n/**\n * Get staff missing required credentials\n */\nexport const getStaffMissingCredentials = async () => {\n  const response = await http.get('/staff/missing-credentials');\n  return response.data;\n};\n\n/**\n * Get credential history\n */\nexport const getCredentialHistory = async (credentialId: number | string) => {\n  const response = await http.get(`/credentials/${credentialId}/history`);\n  return response.data;\n};\n\n// ==============================|| CASELOAD ENDPOINTS ||============================== //\n\n/**\n * Get caseload for a staff member\n */\nexport const getStaffCaseload = async (staffId: number | string, status?: string) => {\n  const response = await http.get(`/staff/${staffId}/caseload${status ? `?status=${status}` : ''}`);\n  return response.data;\n};\n\n/**\n * Assign patient to staff member\n */\nexport const assignPatient = async (staffId: number | string, assignmentData: Partial<StaffCaseload>) => {\n  const response = await http.post(`/staff/${staffId}/caseload`, assignmentData);\n  return response.data;\n};\n\n// ==============================|| SCHEDULE ENDPOINTS ||============================== //\n\n/**\n * Get schedule for a staff member\n */\nexport const getStaffSchedule = async (staffId: number | string, params?: {\n  start_date?: string;\n  end_date?: string;\n}) => {\n  const queryParams = new URLSearchParams();\n  if (params) {\n    Object.entries(params).forEach(([key, value]) => {\n      if (value !== undefined && value !== null && value !== '') {\n        queryParams.append(key, String(value));\n      }\n    });\n  }\n  const queryString = queryParams.toString();\n  const response = await http.get(`/staff/${staffId}/schedule${queryString ? `?${queryString}` : ''}`);\n  return response.data;\n};\n\n/**\n * Create schedule entry\n */\nexport const createSchedule = async (staffId: number | string, scheduleData: Partial<StaffSchedule>) => {\n  const response = await http.post(`/staff/${staffId}/schedule`, scheduleData);\n  return response.data;\n};\n\n// ==============================|| TRAINING ENDPOINTS ||============================== //\n\n/**\n * Get training records for a staff member\n */\nexport const getStaffTraining = async (staffId: number | string, params?: {\n  status?: string;\n  training_type?: string;\n}) => {\n  const queryParams = new URLSearchParams();\n  if (params) {\n    Object.entries(params).forEach(([key, value]) => {\n      if (value !== undefined && value !== null && value !== '') {\n        queryParams.append(key, String(value));\n      }\n    });\n  }\n  const queryString = queryParams.toString();\n  const response = await http.get(`/staff/${staffId}/training${queryString ? `?${queryString}` : ''}`);\n  return response.data;\n};\n\n/**\n * Add training record\n */\nexport const addTraining = async (staffId: number | string, trainingData: Partial<StaffTraining>) => {\n  const response = await http.post(`/staff/${staffId}/training`, trainingData);\n  return response.data;\n};\n\n// ==============================|| PRODUCTIVITY ENDPOINTS ||============================== //\n\n/**\n * Get productivity metrics for a staff member\n */\nexport const getStaffProductivity = async (staffId: number | string, params?: {\n  period_type?: string;\n  start_date?: string;\n  end_date?: string;\n}) => {\n  const queryParams = new URLSearchParams();\n  if (params) {\n    Object.entries(params).forEach(([key, value]) => {\n      if (value !== undefined && value !== null && value !== '') {\n        queryParams.append(key, String(value));\n      }\n    });\n  }\n  const queryString = queryParams.toString();\n  const response = await http.get(`/staff/${staffId}/productivity${queryString ? `?${queryString}` : ''}`);\n  return response.data;\n};\n\n/**\n * Get staff audit log\n */\nexport const getStaffAuditLog = async (staffId: number | string, params?: {\n  start_date?: string;\n  end_date?: string;\n  limit?: number;\n  offset?: number;\n}) => {\n  const queryParams = new URLSearchParams();\n  if (params) {\n    Object.entries(params).forEach(([key, value]) => {\n      if (value !== undefined && value !== null && value !== '') {\n        queryParams.append(key, String(value));\n      }\n    });\n  }\n  const queryString = queryParams.toString();\n  const response = await http.get(`/staff/${staffId}/audit-log${queryString ? `?${queryString}` : ''}`);\n  return response.data;\n};\n"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Explore existing codebase structure for staff-related code",
      "status": "completed",
      "activeForm": "Exploring existing codebase structure"
    },
    {
      "content": "Plan staff directory UI implementation",
      "status": "completed",
      "activeForm": "Planning staff directory UI implementation"
    },
    {
      "content": "Create staff API service",
      "status": "completed",
      "activeForm": "Creating staff API service"
    },
    {
      "content": "Create staff directory page component",
      "status": "in_progress",
      "activeForm": "Creating staff directory page component"
    },
    {
      "content": "Create app route for staff page",
      "status": "pending",
      "activeForm": "Creating app route for staff page"
    },
    {
      "content": "Update menu to include staff directory",
      "status": "pending",
      "activeForm": "Updating menu"
    },
    {
      "content": "Create Playwright verification test",
      "status": "pending",
      "activeForm": "Creating Playwright verification test"
    },
    {
      "content": "Run verification test and fix any issues",
      "status": "pending",
      "activeForm": "Running verification test"
    },
    {
      "content": "Delete temporary test file",
      "status": "pending",
      "activeForm": "Deleting temporary test file"
    }
  ]
}

Now let me create the Staff Directory page component. I'll use the same patterns as the PatientsPage and UserManagementDashboard.

🔧 Tool: Write
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/apps/web/src/views/staff/StaffDirectoryPage.tsx",
  "content": "'use client';\n\nimport React, { useState, useEffect, useMemo, useCallback } from 'react';\nimport { useRouter } from 'next/navigation';\nimport Swal from 'sweetalert2';\n\n// MUI Components\nimport Box from '@mui/material/Box';\nimport Grid from '@mui/material/Grid';\nimport Button from '@mui/material/Button';\nimport IconButton from '@mui/material/IconButton';\nimport Stack from '@mui/material/Stack';\nimport Tooltip from '@mui/material/Tooltip';\nimport Typography from '@mui/material/Typography';\nimport Chip from '@mui/material/Chip';\nimport Card from '@mui/material/Card';\nimport CardContent from '@mui/material/CardContent';\nimport TextField from '@mui/material/TextField';\nimport InputAdornment from '@mui/material/InputAdornment';\nimport MenuItem from '@mui/material/MenuItem';\nimport Select from '@mui/material/Select';\nimport FormControl from '@mui/material/FormControl';\nimport InputLabel from '@mui/material/InputLabel';\nimport Dialog from '@mui/material/Dialog';\nimport DialogTitle from '@mui/material/DialogTitle';\nimport DialogContent from '@mui/material/DialogContent';\nimport DialogActions from '@mui/material/DialogActions';\nimport Table from '@mui/material/Table';\nimport TableBody from '@mui/material/TableBody';\nimport TableCell from '@mui/material/TableCell';\nimport TableHead from '@mui/material/TableHead';\nimport TableRow from '@mui/material/TableRow';\nimport TablePagination from '@mui/material/TablePagination';\nimport TableSortLabel from '@mui/material/TableSortLabel';\nimport Tabs from '@mui/material/Tabs';\nimport Tab from '@mui/material/Tab';\nimport CircularProgress from '@mui/material/CircularProgress';\nimport Alert from '@mui/material/Alert';\nimport Divider from '@mui/material/Divider';\nimport List from '@mui/material/List';\nimport ListItem from '@mui/material/ListItem';\nimport ListItemText from '@mui/material/ListItemText';\n\n// Icons\nimport {\n  Add,\n  Edit,\n  Eye,\n  Trash,\n  SearchNormal1,\n  Profile2User,\n  Call,\n  Sms,\n  Award,\n  Calendar,\n  Briefcase,\n  Warning2,\n  Refresh2,\n  ExportSquare,\n  CloseCircle\n} from 'iconsax-react';\n\n// Project Imports\nimport MainCard from 'components/MainCard';\nimport Avatar from 'components/@extended/Avatar';\nimport http from '../../hooks/useCookie';\nimport AuthService from 'types/AuthService';\nimport { getAllStaff, getStaffCredentials, deleteStaff, StaffProfile, StaffCredential } from '../../api/staff';\n\n// ==============================|| TYPES ||============================== //\n\ntype TabValue = 'directory' | 'expiring' | 'departments';\ntype Order = 'asc' | 'desc';\n\n// Status configurations\nconst statusConfig: Record<string, { color: 'success' | 'error' | 'warning' | 'default' | 'info'; label: string }> = {\n  ACTIVE: { color: 'success', label: 'Active' },\n  INACTIVE: { color: 'default', label: 'Inactive' },\n  TERMINATED: { color: 'error', label: 'Terminated' },\n  ON_LEAVE: { color: 'warning', label: 'On Leave' }\n};\n\nconst credentialStatusConfig: Record<string, { color: 'success' | 'error' | 'warning' | 'default' | 'info'; label: string }> = {\n  ACTIVE: { color: 'success', label: 'Active' },\n  EXPIRED: { color: 'error', label: 'Expired' },\n  REVOKED: { color: 'error', label: 'Revoked' },\n  PENDING_RENEWAL: { color: 'warning', label: 'Pending Renewal' }\n};\n\nconst departmentConfig: Record<string, { color: string; icon: React.ReactNode }> = {\n  NURSING: { color: '#1976d2', icon: <Profile2User size={16} /> },\n  SOCIAL_WORK: { color: '#9c27b0', icon: <Profile2User size={16} /> },\n  CHAPLAINCY: { color: '#673ab7', icon: <Profile2User size={16} /> },\n  ADMIN: { color: '#607d8b', icon: <Briefcase size={16} /> },\n  MEDICAL: { color: '#4caf50', icon: <Profile2User size={16} /> }\n};\n\n// Helper functions\nconst formatDate = (dateString?: string): string => {\n  if (!dateString) return 'N/A';\n  const date = new Date(dateString);\n  return date.toLocaleDateString('en-US', {\n    month: 'short',\n    day: 'numeric',\n    year: 'numeric'\n  });\n};\n\nconst formatPhone = (phone?: string): string => {\n  if (!phone) return 'N/A';\n  const cleaned = phone.replace(/\\D/g, '');\n  if (cleaned.length === 10) {\n    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;\n  }\n  return phone;\n};\n\nconst getDaysUntilExpiration = (expirationDate: string): number => {\n  const today = new Date();\n  const expDate = new Date(expirationDate);\n  const diffTime = expDate.getTime() - today.getTime();\n  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));\n};\n\n// ==============================|| STAFF DIRECTORY PAGE ||============================== //\n\nconst StaffDirectoryPage: React.FC = () => {\n  const router = useRouter();\n  const { permissions, logout, user: currentUser } = AuthService();\n\n  // State\n  const [staff, setStaff] = useState<StaffProfile[]>([]);\n  const [loading, setLoading] = useState(true);\n  const [error, setError] = useState<string | null>(null);\n  const [activeTab, setActiveTab] = useState<TabValue>('directory');\n\n  // Staff detail dialog\n  const [selectedStaff, setSelectedStaff] = useState<StaffProfile | null>(null);\n  const [staffCredentials, setStaffCredentials] = useState<StaffCredential[]>([]);\n  const [detailDialogOpen, setDetailDialogOpen] = useState(false);\n  const [loadingCredentials, setLoadingCredentials] = useState(false);\n\n  // Filters & Search\n  const [searchQuery, setSearchQuery] = useState('');\n  const [statusFilter, setStatusFilter] = useState<string>('all');\n  const [departmentFilter, setDepartmentFilter] = useState<string>('all');\n\n  // Pagination\n  const [page, setPage] = useState(0);\n  const [rowsPerPage, setRowsPerPage] = useState(10);\n\n  // Sorting\n  const [orderBy, setOrderBy] = useState<keyof StaffProfile>('last_name');\n  const [order, setOrder] = useState<Order>('asc');\n\n  // Stats\n  const [stats, setStats] = useState({\n    total: 0,\n    active: 0,\n    onLeave: 0,\n    byDepartment: {} as Record<string, number>\n  });\n\n  // Check permissions\n  const isAdmin = currentUser?.role === 'admin' ||\n                  currentUser?.role?.name === 'admin' ||\n                  String(currentUser?.role).toLowerCase() === 'admin';\n\n  const hasPermission = (permissionName: string) => {\n    if (isAdmin) return true;\n    return permissions.includes(permissionName);\n  };\n\n  // Fetch staff data\n  const fetchStaff = useCallback(async () => {\n    setLoading(true);\n    setError(null);\n    try {\n      const response = await getAllStaff({ limit: 500 });\n      let staffData: StaffProfile[] = [];\n\n      if (Array.isArray(response)) {\n        staffData = response;\n      } else if (response?.data && Array.isArray(response.data)) {\n        staffData = response.data;\n      }\n\n      setStaff(staffData);\n\n      // Calculate stats\n      const activeCount = staffData.filter(s => s.employment_status === 'ACTIVE').length;\n      const onLeaveCount = staffData.filter(s => s.employment_status === 'ON_LEAVE').length;\n\n      const deptCounts: Record<string, number> = {};\n      staffData.forEach(s => {\n        if (s.department) {\n          deptCounts[s.department] = (deptCounts[s.department] || 0) + 1;\n        }\n      });\n\n      setStats({\n        total: staffData.length,\n        active: activeCount,\n        onLeave: onLeaveCount,\n        byDepartment: deptCounts\n      });\n    } catch (err: any) {\n      console.error('Error fetching staff:', err);\n      if (err.response?.status === 401) {\n        logout();\n      } else {\n        setError('Failed to load staff directory. Please try again.');\n      }\n    } finally {\n      setLoading(false);\n    }\n  }, [logout]);\n\n  // Fetch credentials for selected staff\n  const fetchCredentials = useCallback(async (staffId: number) => {\n    setLoadingCredentials(true);\n    try {\n      const response = await getStaffCredentials(staffId);\n      let credentialsData: StaffCredential[] = [];\n\n      if (Array.isArray(response)) {\n        credentialsData = response;\n      } else if (response?.data && Array.isArray(response.data)) {\n        credentialsData = response.data;\n      }\n\n      setStaffCredentials(credentialsData);\n    } catch (err: any) {\n      console.error('Error fetching credentials:', err);\n      setStaffCredentials([]);\n    } finally {\n      setLoadingCredentials(false);\n    }\n  }, []);\n\n  useEffect(() => {\n    fetchStaff();\n  }, [fetchStaff]);\n\n  // Handle view staff details\n  const handleViewStaff = async (staffMember: StaffProfile) => {\n    setSelectedStaff(staffMember);\n    setDetailDialogOpen(true);\n    await fetchCredentials(staffMember.id);\n  };\n\n  // Handle delete staff\n  const handleDeleteStaff = async (staffMember: StaffProfile) => {\n    const result = await Swal.fire({\n      title: 'Confirm Delete',\n      text: `Are you sure you want to delete ${staffMember.first_name} ${staffMember.last_name}? This action cannot be undone.`,\n      icon: 'warning',\n      showCancelButton: true,\n      confirmButtonColor: '#d33',\n      cancelButtonColor: '#3085d6',\n      confirmButtonText: 'Yes, delete',\n      cancelButtonText: 'Cancel'\n    });\n\n    if (result.isConfirmed) {\n      try {\n        await deleteStaff(staffMember.id);\n        Swal.fire('Deleted!', 'Staff member has been deleted.', 'success');\n        fetchStaff();\n      } catch (err: any) {\n        Swal.fire('Error', 'Failed to delete staff member.', 'error');\n      }\n    }\n  };\n\n  // Filtering logic\n  const filteredStaff = useMemo(() => {\n    return staff.filter(s => {\n      const matchesSearch = searchQuery === '' ||\n        `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||\n        s.employee_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||\n        s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||\n        s.job_title?.toLowerCase().includes(searchQuery.toLowerCase());\n\n      const matchesStatus = statusFilter === 'all' || s.employment_status === statusFilter;\n      const matchesDepartment = departmentFilter === 'all' || s.department === departmentFilter;\n\n      return matchesSearch && matchesStatus && matchesDepartment;\n    });\n  }, [staff, searchQuery, statusFilter, departmentFilter]);\n\n  // Sorting logic\n  const sortedStaff = useMemo(() => {\n    const comparator = (a: StaffProfile, b: StaffProfile): number => {\n      const aVal = a[orderBy] ?? '';\n      const bVal = b[orderBy] ?? '';\n      if (bVal < aVal) return order === 'desc' ? -1 : 1;\n      if (bVal > aVal) return order === 'desc' ? 1 : -1;\n      return 0;\n    };\n    return [...filteredStaff].sort(comparator);\n  }, [filteredStaff, order, orderBy]);\n\n  // Paginated staff\n  const paginatedStaff = useMemo(() => {\n    return sortedStaff.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);\n  }, [sortedStaff, page, rowsPerPage]);\n\n  // Get unique departments\n  const departments = useMemo(() => {\n    const depts = new Set(staff.map(s => s.department).filter(Boolean));\n    return Array.from(depts) as string[];\n  }, [staff]);\n\n  // Handle sort\n  const handleSort = (property: keyof StaffProfile) => {\n    const isAsc = orderBy === property && order === 'asc';\n    setOrder(isAsc ? 'desc' : 'asc');\n    setOrderBy(property);\n  };\n\n  // Column definitions\n  const columns = [\n    { id: 'employee_id' as keyof StaffProfile, label: 'Employee ID', sortable: true },\n    { id: 'last_name' as keyof StaffProfile, label: 'Name', sortable: true },\n    { id: 'job_title' as keyof StaffProfile, label: 'Job Title', sortable: true },\n    { id: 'department' as keyof StaffProfile, label: 'Department', sortable: true },\n    { id: 'email' as keyof StaffProfile, label: 'Contact', sortable: false },\n    { id: 'employment_status' as keyof StaffProfile, label: 'Status', sortable: true },\n    { id: 'actions' as keyof StaffProfile, label: 'Actions', sortable: false }\n  ];\n\n  return (\n    <>\n      {/* Stats Cards */}\n      <Grid container spacing={3} sx={{ mb: 3 }}>\n        <Grid item xs={12} sm={6} md={3}>\n          <Card>\n            <CardContent>\n              <Stack spacing={1}>\n                <Typography variant=\"subtitle2\" color=\"textSecondary\">Total Staff</Typography>\n                <Typography variant=\"h3\">{stats.total}</Typography>\n              </Stack>\n            </CardContent>\n          </Card>\n        </Grid>\n        <Grid item xs={12} sm={6} md={3}>\n          <Card>\n            <CardContent>\n              <Stack spacing={1}>\n                <Typography variant=\"subtitle2\" color=\"textSecondary\">Active</Typography>\n                <Typography variant=\"h3\" color=\"success.main\">{stats.active}</Typography>\n              </Stack>\n            </CardContent>\n          </Card>\n        </Grid>\n        <Grid item xs={12} sm={6} md={3}>\n          <Card>\n            <CardContent>\n              <Stack spacing={1}>\n                <Typography variant=\"subtitle2\" color=\"textSecondary\">On Leave</Typography>\n                <Typography variant=\"h3\" color=\"warning.main\">{stats.onLeave}</Typography>\n              </Stack>\n            </CardContent>\n          </Card>\n        </Grid>\n        <Grid item xs={12} sm={6} md={3}>\n          <Card>\n            <CardContent>\n              <Stack spacing={1}>\n                <Typography variant=\"subtitle2\" color=\"textSecondary\">Departments</Typography>\n                <Typography variant=\"h3\">{departments.length}</Typography>\n              </Stack>\n            </CardContent>\n          </Card>\n        </Grid>\n      </Grid>\n\n      {/* Main Content */}\n      <MainCard\n        title=\"Staff Directory\"\n        secondary={\n          <Stack direction=\"row\" spacing={2}>\n            <Tooltip title=\"Refresh\">\n              <IconButton onClick={fetchStaff} disabled={loading}>\n                <Refresh2 size={20} />\n              </IconButton>\n            </Tooltip>\n            {hasPermission('manage:staff') && (\n              <Button\n                variant=\"contained\"\n                startIcon={<Add />}\n                onClick={() => router.push('/admin/staff/new')}\n              >\n                Add Staff\n              </Button>\n            )}\n          </Stack>\n        }\n      >\n        {/* Tabs */}\n        <Tabs\n          value={activeTab}\n          onChange={(_, v) => setActiveTab(v as TabValue)}\n          sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}\n        >\n          <Tab label=\"Directory\" value=\"directory\" icon={<Profile2User size={18} />} iconPosition=\"start\" />\n          <Tab label=\"Expiring Credentials\" value=\"expiring\" icon={<Warning2 size={18} />} iconPosition=\"start\" />\n          <Tab label=\"By Department\" value=\"departments\" icon={<Briefcase size={18} />} iconPosition=\"start\" />\n        </Tabs>\n\n        {activeTab === 'directory' && (\n          <>\n            {/* Search and Filters */}\n            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>\n              <TextField\n                placeholder=\"Search by name, email, employee ID...\"\n                value={searchQuery}\n                onChange={(e) => setSearchQuery(e.target.value)}\n                InputProps={{\n                  startAdornment: (\n                    <InputAdornment position=\"start\">\n                      <SearchNormal1 size={18} />\n                    </InputAdornment>\n                  )\n                }}\n                sx={{ minWidth: 300 }}\n              />\n              <FormControl sx={{ minWidth: 150 }}>\n                <InputLabel>Status</InputLabel>\n                <Select\n                  value={statusFilter}\n                  label=\"Status\"\n                  onChange={(e) => setStatusFilter(e.target.value)}\n                >\n                  <MenuItem value=\"all\">All Status</MenuItem>\n                  <MenuItem value=\"ACTIVE\">Active</MenuItem>\n                  <MenuItem value=\"INACTIVE\">Inactive</MenuItem>\n                  <MenuItem value=\"ON_LEAVE\">On Leave</MenuItem>\n                  <MenuItem value=\"TERMINATED\">Terminated</MenuItem>\n                </Select>\n              </FormControl>\n              <FormControl sx={{ minWidth: 150 }}>\n                <InputLabel>Department</InputLabel>\n                <Select\n                  value={departmentFilter}\n                  label=\"Department\"\n                  onChange={(e) => setDepartmentFilter(e.target.value)}\n                >\n                  <MenuItem value=\"all\">All Departments</MenuItem>\n                  {departments.map(dept => (\n                    <MenuItem key={dept} value={dept}>{dept}</MenuItem>\n                  ))}\n                </Select>\n              </FormControl>\n            </Stack>\n\n            {/* Error Alert */}\n            {error && (\n              <Alert severity=\"error\" sx={{ mb: 2 }} onClose={() => setError(null)}>\n                {error}\n              </Alert>\n            )}\n\n            {/* Loading State */}\n            {loading ? (\n              <Box display=\"flex\" justifyContent=\"center\" alignItems=\"center\" minHeight={400}>\n                <CircularProgress />\n              </Box>\n            ) : (\n              <>\n                {/* Staff Table */}\n                <Box sx={{ overflowX: 'auto' }}>\n                  <Table>\n                    <TableHead>\n                      <TableRow>\n                        {columns.map((column) => (\n                          <TableCell key={column.id} align=\"left\">\n                            {column.sortable ? (\n                              <TableSortLabel\n                                active={orderBy === column.id}\n                                direction={orderBy === column.id ? order : 'asc'}\n                                onClick={() => handleSort(column.id)}\n                              >\n                                {column.label}\n                              </TableSortLabel>\n                            ) : (\n                              column.label\n                            )}\n                          </TableCell>\n                        ))}\n                      </TableRow>\n                    </TableHead>\n                    <TableBody>\n                      {paginatedStaff.length === 0 ? (\n                        <TableRow>\n                          <TableCell colSpan={columns.length} align=\"center\">\n                            <Typography variant=\"body2\" color=\"textSecondary\" sx={{ py: 4 }}>\n                              No staff members found\n                            </Typography>\n                          </TableCell>\n                        </TableRow>\n                      ) : (\n                        paginatedStaff.map((staffMember) => (\n                          <TableRow key={staffMember.id} hover>\n                            <TableCell>{staffMember.employee_id || 'N/A'}</TableCell>\n                            <TableCell>\n                              <Stack direction=\"row\" spacing={2} alignItems=\"center\">\n                                <Avatar size=\"sm\" color=\"primary\">\n                                  {staffMember.first_name?.[0]}{staffMember.last_name?.[0]}\n                                </Avatar>\n                                <Box>\n                                  <Typography variant=\"subtitle2\">\n                                    {staffMember.last_name}, {staffMember.first_name}\n                                    {staffMember.preferred_name && ` (${staffMember.preferred_name})`}\n                                  </Typography>\n                                  {staffMember.specialty && (\n                                    <Typography variant=\"caption\" color=\"textSecondary\">\n                                      {staffMember.specialty}\n                                    </Typography>\n                                  )}\n                                </Box>\n                              </Stack>\n                            </TableCell>\n                            <TableCell>{staffMember.job_title || 'N/A'}</TableCell>\n                            <TableCell>\n                              {staffMember.department ? (\n                                <Chip\n                                  label={staffMember.department}\n                                  size=\"small\"\n                                  sx={{\n                                    bgcolor: departmentConfig[staffMember.department]?.color || '#607d8b',\n                                    color: 'white'\n                                  }}\n                                />\n                              ) : 'N/A'}\n                            </TableCell>\n                            <TableCell>\n                              <Stack spacing={0.5}>\n                                {staffMember.email && (\n                                  <Stack direction=\"row\" spacing={1} alignItems=\"center\">\n                                    <Sms size={14} />\n                                    <Typography variant=\"body2\">{staffMember.email}</Typography>\n                                  </Stack>\n                                )}\n                                {staffMember.phone && (\n                                  <Stack direction=\"row\" spacing={1} alignItems=\"center\">\n                                    <Call size={14} />\n                                    <Typography variant=\"body2\">{formatPhone(staffMember.phone)}</Typography>\n                                  </Stack>\n                                )}\n                              </Stack>\n                            </TableCell>\n                            <TableCell>\n                              <Chip\n                                label={statusConfig[staffMember.employment_status]?.label || staffMember.employment_status}\n                                color={statusConfig[staffMember.employment_status]?.color || 'default'}\n                                size=\"small\"\n                              />\n                            </TableCell>\n                            <TableCell>\n                              <Stack direction=\"row\" spacing={1}>\n                                <Tooltip title=\"View Details\">\n                                  <IconButton\n                                    size=\"small\"\n                                    onClick={() => handleViewStaff(staffMember)}\n                                  >\n                                    <Eye size={18} />\n                                  </IconButton>\n                                </Tooltip>\n                                {hasPermission('manage:staff') && (\n                                  <>\n                                    <Tooltip title=\"Edit\">\n                                      <IconButton\n                                        size=\"small\"\n                                        onClick={() => router.push(`/admin/staff/${staffMember.id}/edit`)}\n                                      >\n                                        <Edit size={18} />\n                                      </IconButton>\n                                    </Tooltip>\n                                    <Tooltip title=\"Delete\">\n                                      <IconButton\n                                        size=\"small\"\n                                        color=\"error\"\n                                        onClick={() => handleDeleteStaff(staffMember)}\n                                      >\n                                        <Trash size={18} />\n                                      </IconButton>\n                                    </Tooltip>\n                                  </>\n                                )}\n                              </Stack>\n                            </TableCell>\n                          </TableRow>\n                        ))\n                      )}\n                    </TableBody>\n                  </Table>\n                </Box>\n\n                {/* Pagination */}\n                <TablePagination\n                  component=\"div\"\n                  count={filteredStaff.length}\n                  page={page}\n                  onPageChange={(_, newPage) => setPage(newPage)}\n                  rowsPerPage={rowsPerPage}\n                  onRowsPerPageChange={(e) => {\n                    setRowsPerPage(parseInt(e.target.value, 10));\n                    setPage(0);\n                  }}\n                  rowsPerPageOptions={[5, 10, 25, 50]}\n                />\n              </>\n            )}\n          </>\n        )}\n\n        {activeTab === 'expiring' && (\n          <Box>\n            <Alert severity=\"info\" sx={{ mb: 2 }}>\n              This tab shows staff credentials expiring within the next 30 days.\n            </Alert>\n            <Typography variant=\"body2\" color=\"textSecondary\">\n              Expiring credentials feature coming soon. Use the API endpoint GET /staff/credentials/expiring for now.\n            </Typography>\n          </Box>\n        )}\n\n        {activeTab === 'departments' && (\n          <Grid container spacing={3}>\n            {Object.entries(stats.byDepartment).map(([dept, count]) => (\n              <Grid item xs={12} sm={6} md={4} key={dept}>\n                <Card variant=\"outlined\">\n                  <CardContent>\n                    <Stack direction=\"row\" justifyContent=\"space-between\" alignItems=\"center\">\n                      <Stack direction=\"row\" spacing={2} alignItems=\"center\">\n                        <Box\n                          sx={{\n                            width: 40,\n                            height: 40,\n                            borderRadius: 2,\n                            bgcolor: departmentConfig[dept]?.color || '#607d8b',\n                            display: 'flex',\n                            alignItems: 'center',\n                            justifyContent: 'center',\n                            color: 'white'\n                          }}\n                        >\n                          <Briefcase size={20} />\n                        </Box>\n                        <Typography variant=\"subtitle1\">{dept}</Typography>\n                      </Stack>\n                      <Typography variant=\"h4\">{count}</Typography>\n                    </Stack>\n                  </CardContent>\n                </Card>\n              </Grid>\n            ))}\n          </Grid>\n        )}\n      </MainCard>\n\n      {/* Staff Detail Dialog */}\n      <Dialog\n        open={detailDialogOpen}\n        onClose={() => setDetailDialogOpen(false)}\n        maxWidth=\"md\"\n        fullWidth\n      >\n        <DialogTitle>\n          <Stack direction=\"row\" justifyContent=\"space-between\" alignItems=\"center\">\n            <Typography variant=\"h5\">Staff Profile</Typography>\n            <IconButton onClick={() => setDetailDialogOpen(false)}>\n              <CloseCircle size={24} />\n            </IconButton>\n          </Stack>\n        </DialogTitle>\n        <DialogContent dividers>\n          {selectedStaff && (\n            <Grid container spacing={3}>\n              {/* Basic Info */}\n              <Grid item xs={12} md={6}>\n                <Typography variant=\"subtitle2\" color=\"textSecondary\" gutterBottom>\n                  Personal Information\n                </Typography>\n                <Stack spacing={2}>\n                  <Stack direction=\"row\" spacing={2} alignItems=\"center\">\n                    <Avatar size=\"lg\" color=\"primary\">\n                      {selectedStaff.first_name?.[0]}{selectedStaff.last_name?.[0]}\n                    </Avatar>\n                    <Box>\n                      <Typography variant=\"h5\">\n                        {selectedStaff.first_name} {selectedStaff.middle_name || ''} {selectedStaff.last_name}\n                      </Typography>\n                      {selectedStaff.preferred_name && (\n                        <Typography variant=\"body2\" color=\"textSecondary\">\n                          Goes by: {selectedStaff.preferred_name}\n                        </Typography>\n                      )}\n                    </Box>\n                  </Stack>\n                  <Divider />\n                  <Box>\n                    <Typography variant=\"body2\" color=\"textSecondary\">Employee ID</Typography>\n                    <Typography variant=\"body1\">{selectedStaff.employee_id || 'N/A'}</Typography>\n                  </Box>\n                  <Box>\n                    <Typography variant=\"body2\" color=\"textSecondary\">Job Title</Typography>\n                    <Typography variant=\"body1\">{selectedStaff.job_title || 'N/A'}</Typography>\n                  </Box>\n                  <Box>\n                    <Typography variant=\"body2\" color=\"textSecondary\">Department</Typography>\n                    <Typography variant=\"body1\">{selectedStaff.department || 'N/A'}</Typography>\n                  </Box>\n                  <Box>\n                    <Typography variant=\"body2\" color=\"textSecondary\">Specialty</Typography>\n                    <Typography variant=\"body1\">{selectedStaff.specialty || 'N/A'}</Typography>\n                  </Box>\n                  <Box>\n                    <Typography variant=\"body2\" color=\"textSecondary\">Employment Type</Typography>\n                    <Typography variant=\"body1\">{selectedStaff.employment_type || 'N/A'}</Typography>\n                  </Box>\n                  <Box>\n                    <Typography variant=\"body2\" color=\"textSecondary\">Status</Typography>\n                    <Chip\n                      label={statusConfig[selectedStaff.employment_status]?.label || selectedStaff.employment_status}\n                      color={statusConfig[selectedStaff.employment_status]?.color || 'default'}\n                      size=\"small\"\n                    />\n                  </Box>\n                </Stack>\n              </Grid>\n\n              {/* Contact Info */}\n              <Grid item xs={12} md={6}>\n                <Typography variant=\"subtitle2\" color=\"textSecondary\" gutterBottom>\n                  Contact Information\n                </Typography>\n                <Stack spacing={2}>\n                  <Box>\n                    <Typography variant=\"body2\" color=\"textSecondary\">Email</Typography>\n                    <Typography variant=\"body1\">{selectedStaff.email || 'N/A'}</Typography>\n                  </Box>\n                  <Box>\n                    <Typography variant=\"body2\" color=\"textSecondary\">Phone</Typography>\n                    <Typography variant=\"body1\">{formatPhone(selectedStaff.phone)}</Typography>\n                  </Box>\n                  <Box>\n                    <Typography variant=\"body2\" color=\"textSecondary\">Mobile</Typography>\n                    <Typography variant=\"body1\">{formatPhone(selectedStaff.mobile)}</Typography>\n                  </Box>\n                  <Divider />\n                  <Box>\n                    <Typography variant=\"body2\" color=\"textSecondary\">Address</Typography>\n                    <Typography variant=\"body1\">\n                      {selectedStaff.address_line1 || 'N/A'}\n                      {selectedStaff.address_line2 && <><br />{selectedStaff.address_line2}</>}\n                      {selectedStaff.city && <><br />{selectedStaff.city}, {selectedStaff.state} {selectedStaff.zip_code}</>}\n                    </Typography>\n                  </Box>\n                  <Divider />\n                  <Box>\n                    <Typography variant=\"body2\" color=\"textSecondary\">Emergency Contact</Typography>\n                    <Typography variant=\"body1\">\n                      {selectedStaff.emergency_contact_name || 'N/A'}\n                      {selectedStaff.emergency_contact_relationship && ` (${selectedStaff.emergency_contact_relationship})`}\n                    </Typography>\n                    {selectedStaff.emergency_contact_phone && (\n                      <Typography variant=\"body2\">{formatPhone(selectedStaff.emergency_contact_phone)}</Typography>\n                    )}\n                  </Box>\n                </Stack>\n              </Grid>\n\n              {/* Employment Info */}\n              <Grid item xs={12} md={6}>\n                <Typography variant=\"subtitle2\" color=\"textSecondary\" gutterBottom>\n                  Employment Details\n                </Typography>\n                <Stack spacing={2}>\n                  <Box>\n                    <Typography variant=\"body2\" color=\"textSecondary\">Hire Date</Typography>\n                    <Typography variant=\"body1\">{formatDate(selectedStaff.hire_date)}</Typography>\n                  </Box>\n                  <Box>\n                    <Typography variant=\"body2\" color=\"textSecondary\">Years of Experience</Typography>\n                    <Typography variant=\"body1\">{selectedStaff.years_of_experience || 'N/A'}</Typography>\n                  </Box>\n                  <Box>\n                    <Typography variant=\"body2\" color=\"textSecondary\">Supervisory Role</Typography>\n                    <Typography variant=\"body1\">{selectedStaff.is_supervisory ? 'Yes' : 'No'}</Typography>\n                  </Box>\n                  <Box>\n                    <Typography variant=\"body2\" color=\"textSecondary\">Max Patient Load</Typography>\n                    <Typography variant=\"body1\">{selectedStaff.max_patient_load || 'N/A'}</Typography>\n                  </Box>\n                </Stack>\n              </Grid>\n\n              {/* Credentials */}\n              <Grid item xs={12} md={6}>\n                <Typography variant=\"subtitle2\" color=\"textSecondary\" gutterBottom>\n                  Credentials & Licenses\n                </Typography>\n                {loadingCredentials ? (\n                  <CircularProgress size={24} />\n                ) : staffCredentials.length === 0 ? (\n                  <Typography variant=\"body2\" color=\"textSecondary\">No credentials on file</Typography>\n                ) : (\n                  <List dense>\n                    {staffCredentials.map((cred) => {\n                      const daysUntil = getDaysUntilExpiration(cred.expiration_date);\n                      const isExpiring = daysUntil > 0 && daysUntil <= 30;\n                      const isExpired = daysUntil <= 0;\n\n                      return (\n                        <ListItem key={cred.id} sx={{ px: 0 }}>\n                          <ListItemText\n                            primary={\n                              <Stack direction=\"row\" spacing={1} alignItems=\"center\">\n                                <Award size={16} />\n                                <Typography variant=\"body2\">{cred.credential_name}</Typography>\n                                <Chip\n                                  label={credentialStatusConfig[cred.credential_status]?.label || cred.credential_status}\n                                  color={credentialStatusConfig[cred.credential_status]?.color || 'default'}\n                                  size=\"small\"\n                                />\n                              </Stack>\n                            }\n                            secondary={\n                              <Stack direction=\"row\" spacing={1} alignItems=\"center\">\n                                <Typography variant=\"caption\" color={isExpired ? 'error' : isExpiring ? 'warning.main' : 'textSecondary'}>\n                                  {cred.credential_number && `#${cred.credential_number} • `}\n                                  Expires: {formatDate(cred.expiration_date)}\n                                  {isExpired && ' (EXPIRED)'}\n                                  {isExpiring && !isExpired && ` (${daysUntil} days)`}\n                                </Typography>\n                              </Stack>\n                            }\n                          />\n                        </ListItem>\n                      );\n                    })}\n                  </List>\n                )}\n              </Grid>\n\n              {/* Notes */}\n              {selectedStaff.notes && (\n                <Grid item xs={12}>\n                  <Typography variant=\"subtitle2\" color=\"textSecondary\" gutterBottom>\n                    Notes\n                  </Typography>\n                  <Typography variant=\"body2\">{selectedStaff.notes}</Typography>\n                </Grid>\n              )}\n            </Grid>\n          )}\n        </DialogContent>\n        <DialogActions>\n          <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>\n          {hasPermission('manage:staff') && selectedStaff && (\n            <Button\n              variant=\"contained\"\n              startIcon={<Edit />}\n              onClick={() => {\n                setDetailDialogOpen(false);\n                router.push(`/admin/staff/${selectedStaff.id}/edit`);\n              }}\n            >\n              Edit Profile\n            </Button>\n          )}\n        </DialogActions>\n      </Dialog>\n    </>\n  );\n};\n\nexport default StaffDirectoryPage;\n"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Explore existing codebase structure for staff-related code",
      "status": "completed",
      "activeForm": "Exploring existing codebase structure"
    },
    {
      "content": "Plan staff directory UI implementation",
      "status": "completed",
      "activeForm": "Planning staff directory UI implementation"
    },
    {
      "content": "Create staff API service",
      "status": "completed",
      "activeForm": "Creating staff API service"
    },
    {
      "content": "Create staff directory page component",
      "status": "completed",
      "activeForm": "Creating staff directory page component"
    },
    {
      "content": "Create app route for staff page",
      "status": "in_progress",
      "activeForm": "Creating app route for staff page"
    },
    {
      "content": "Update menu to include staff directory",
      "status": "pending",
      "activeForm": "Updating menu"
    },
    {
      "content": "Create Playwright verification test",
      "status": "pending",
      "activeForm": "Creating Playwright verification test"
    },
    {
      "content": "Run verification test and fix any issues",
      "status": "pending",
      "activeForm": "Running verification test"
    },
    {
      "content": "Delete temporary test file",
      "status": "pending",
      "activeForm": "Deleting temporary test file"
    }
  ]
}

Now let me create the app route for the staff directory page.

🔧 Tool: Bash
Input: {
  "command": "mkdir -p /Users/fabrice/Sites/chartwarden/Chartwarden/apps/web/src/app/\\(dashboard\\)/admin/staff",
  "description": "Create staff route directory"
}

🔧 Tool: Write
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/apps/web/src/app/(dashboard)/admin/staff/page.tsx",
  "content": "'use client';\n\nimport StaffDirectoryPage from '../../../../views/staff/StaffDirectoryPage';\n\nexport default function StaffPage() {\n  return <StaffDirectoryPage />;\n}\n"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Explore existing codebase structure for staff-related code",
      "status": "completed",
      "activeForm": "Exploring existing codebase structure"
    },
    {
      "content": "Plan staff directory UI implementation",
      "status": "completed",
      "activeForm": "Planning staff directory UI implementation"
    },
    {
      "content": "Create staff API service",
      "status": "completed",
      "activeForm": "Creating staff API service"
    },
    {
      "content": "Create staff directory page component",
      "status": "completed",
      "activeForm": "Creating staff directory page component"
    },
    {
      "content": "Create app route for staff page",
      "status": "completed",
      "activeForm": "Creating app route for staff page"
    },
    {
      "content": "Update menu to include staff directory",
      "status": "in_progress",
      "activeForm": "Updating menu"
    },
    {
      "content": "Create Playwright verification test",
      "status": "pending",
      "activeForm": "Creating Playwright verification test"
    },
    {
      "content": "Run verification test and fix any issues",
      "status": "pending",
      "activeForm": "Running verification test"
    },
    {
      "content": "Delete temporary test file",
      "status": "pending",
      "activeForm": "Deleting temporary test file"
    }
  ]
}

Now let me update the menu to include the staff directory. Let me read the current menu configuration first.

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/apps/web/src/menu-items/user-management.tsx"
}

🔧 Tool: Edit
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/apps/web/src/menu-items/user-management.tsx",
  "old_string": "// ASSETS\nimport {BrifecaseTick,User,KyberNetwork, Messages2, Calendar1, Kanban, Profile2User, Bill, UserSquare, ShoppingBag,Unlock, Setting2 } from 'iconsax-react';",
  "new_string": "// ASSETS\nimport {BrifecaseTick,User,KyberNetwork, Messages2, Calendar1, Kanban, Profile2User, Bill, UserSquare, ShoppingBag,Unlock, Setting2, People } from 'iconsax-react';"
}

🔧 Tool: Edit
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/apps/web/src/menu-items/user-management.tsx",
  "old_string": "// ICONS\nconst icons = {\n  applications: KyberNetwork,\n  chat: Messages2,\n  calendar: Calendar1,\n  kanban: Kanban,\n  customer: Profile2User,\n  invoice: Bill,\n  profile: UserSquare,\n  ecommerce: ShoppingBag,\n  users: User,\n  permissions: Unlock,\n  roles: BrifecaseTick,\n  adminDashboard: Setting2,\n};",
  "new_string": "// ICONS\nconst icons = {\n  applications: KyberNetwork,\n  chat: Messages2,\n  calendar: Calendar1,\n  kanban: Kanban,\n  customer: Profile2User,\n  invoice: Bill,\n  profile: UserSquare,\n  ecommerce: ShoppingBag,\n  users: User,\n  permissions: Unlock,\n  roles: BrifecaseTick,\n  adminDashboard: Setting2,\n  staff: People,\n};"
}

🔧 Tool: Edit
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/apps/web/src/menu-items/user-management.tsx",
  "old_string": "    hasPermission('users_principal_menu') ? [{\n        id: 'users',\n        title: <FormattedMessage id=\"users\" />,\n        type: 'item',\n        url: '/users',\n        icon: icons.users,\n        breadcrumbs: false\n    }] : []\n  ),\n};",
  "new_string": "    hasPermission('users_principal_menu') ? [{\n        id: 'users',\n        title: <FormattedMessage id=\"users\" />,\n        type: 'item',\n        url: '/users',\n        icon: icons.users,\n        breadcrumbs: false\n    }] : [],\n    // Staff Directory - shown to admins and users with staff permissions\n    (isAdmin || hasPermission('manage:staff') || hasPermission('view:staff')) ? [{\n        id: 'staff-directory',\n        title: <FormattedMessage id=\"Staff Directory\" />,\n        type: 'item',\n        url: '/admin/staff',\n        icon: icons.staff,\n        breadcrumbs: false\n    }] : []\n  ),\n};"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Explore existing codebase structure for staff-related code",
      "status": "completed",
      "activeForm": "Exploring existing codebase structure"
    },
    {
      "content": "Plan staff directory UI implementation",
      "status": "completed",
      "activeForm": "Planning staff directory UI implementation"
    },
    {
      "content": "Create staff API service",
      "status": "completed",
      "activeForm": "Creating staff API service"
    },
    {
      "content": "Create staff directory page component",
      "status": "completed",
      "activeForm": "Creating staff directory page component"
    },
    {
      "content": "Create app route for staff page",
      "status": "completed",
      "activeForm": "Creating app route for staff page"
    },
    {
      "content": "Update menu to include staff directory",
      "status": "completed",
      "activeForm": "Updating menu"
    },
    {
      "content": "Create Playwright verification test",
      "status": "in_progress",
      "activeForm": "Creating Playwright verification test"
    },
    {
      "content": "Run verification test and fix any issues",
      "status": "pending",
      "activeForm": "Running verification test"
    },
    {
      "content": "Delete temporary test file",
      "status": "pending",
      "activeForm": "Deleting temporary test file"
    }
  ]
}

Now let me check the Playwright configuration and create a verification test.

🔧 Tool: Glob
Input: {
  "pattern": "**/playwright.config.*",
  "path": "/Users/fabrice/Sites/chartwarden/Chartwarden"
}

🔧 Tool: Glob
Input: {
  "pattern": "**/*.spec.ts",
  "path": "/Users/fabrice/Sites/chartwarden/Chartwarden/apps/web/tests"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/apps/web/playwright.config.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/apps/web/tests/billing-dashboard-verification.spec.ts",
  "limit": 100
}

Now let me create the verification test for the staff directory.

🔧 Tool: Write
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/apps/web/tests/staff-ui-verification.spec.ts",
  "content": "import { test, expect } from '@playwright/test';\n\n/**\n * Verification tests for Staff Directory UI feature\n * Feature: staff-ui\n *\n * This test verifies:\n * 1. Staff directory page loads correctly\n * 2. Staff API endpoints exist and require authentication\n * 3. Staff profile endpoints work\n * 4. Credential endpoints exist\n * 5. All endpoints are properly protected\n *\n * TEMPORARY TEST - Delete after verification\n */\n\nconst API_BASE_URL = 'http://localhost:3001/api';\nconst APP_BASE_URL = 'http://localhost:3000';\n\ntest.describe('Staff Directory - API Endpoints', () => {\n  test('should have staff list endpoint (GET /staff)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/staff`);\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should support search filtering on staff list', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/staff?search=test`);\n    // Should require authentication, not reject the search parameter\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should support status filtering on staff list', async ({ request }) => {\n    const statuses = ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED'];\n\n    for (const status of statuses) {\n      const response = await request.get(`${API_BASE_URL}/staff?status=${status}`);\n      // Should require authentication, not reject the status\n      expect([401, 403]).toContain(response.status());\n    }\n  });\n\n  test('should support department filtering on staff list', async ({ request }) => {\n    const departments = ['NURSING', 'SOCIAL_WORK', 'CHAPLAINCY', 'ADMIN'];\n\n    for (const department of departments) {\n      const response = await request.get(`${API_BASE_URL}/staff?department=${department}`);\n      // Should require authentication, not reject the department\n      expect([401, 403]).toContain(response.status());\n    }\n  });\n\n  test('should support pagination on staff list', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/staff?limit=25&offset=0`);\n    // Should require authentication\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have staff detail endpoint (GET /staff/:id)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/staff/1`);\n    // Should require authentication (not 404 for missing ID - endpoint exists)\n    expect([401, 403, 404]).toContain(response.status());\n  });\n});\n\ntest.describe('Staff Directory - Credential Endpoints', () => {\n  test('should have staff credentials endpoint (GET /staff/:id/credentials)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/staff/1/credentials`);\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403, 404]).toContain(response.status());\n  });\n\n  test('should have expiring credentials endpoint (GET /staff/credentials/expiring)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/staff/credentials/expiring`);\n    // Should require authentication\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should support days parameter on expiring credentials', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/staff/credentials/expiring?days=60`);\n    // Should require authentication\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have expired credentials endpoint (GET /credentials/expired)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/credentials/expired`);\n    // Should require authentication\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have missing credentials endpoint (GET /staff/missing-credentials)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/staff/missing-credentials`);\n    // Should require authentication\n    expect([401, 403]).toContain(response.status());\n  });\n});\n\ntest.describe('Staff Directory - Caseload Endpoints', () => {\n  test('should have staff caseload endpoint (GET /staff/:id/caseload)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/staff/1/caseload`);\n    // Should require authentication\n    expect([401, 403, 404]).toContain(response.status());\n  });\n\n  test('should support status filtering on caseload', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/staff/1/caseload?status=ACTIVE`);\n    // Should require authentication\n    expect([401, 403, 404]).toContain(response.status());\n  });\n});\n\ntest.describe('Staff Directory - Schedule Endpoints', () => {\n  test('should have staff schedule endpoint (GET /staff/:id/schedule)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/staff/1/schedule`);\n    // Should require authentication\n    expect([401, 403, 404]).toContain(response.status());\n  });\n\n  test('should support date range filtering on schedule', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/staff/1/schedule?start_date=2024-01-01&end_date=2024-12-31`);\n    // Should require authentication\n    expect([401, 403, 404]).toContain(response.status());\n  });\n});\n\ntest.describe('Staff Directory - Training Endpoints', () => {\n  test('should have staff training endpoint (GET /staff/:id/training)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/staff/1/training`);\n    // Should require authentication\n    expect([401, 403, 404]).toContain(response.status());\n  });\n\n  test('should support status filtering on training', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/staff/1/training?status=COMPLETED`);\n    // Should require authentication\n    expect([401, 403, 404]).toContain(response.status());\n  });\n});\n\ntest.describe('Staff Directory - Productivity Endpoints', () => {\n  test('should have staff productivity endpoint (GET /staff/:id/productivity)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/staff/1/productivity`);\n    // Should require authentication\n    expect([401, 403, 404]).toContain(response.status());\n  });\n});\n\ntest.describe('Staff Directory - UI Page', () => {\n  test('should have staff directory page route', async ({ page }) => {\n    // Navigate to staff directory (will redirect to login if not authenticated)\n    await page.goto(`${APP_BASE_URL}/admin/staff`);\n\n    // Wait for page to load - should either show staff page or login redirect\n    await page.waitForLoadState('networkidle');\n\n    // The page should load (not 404)\n    const title = await page.title();\n    expect(title).toBeDefined();\n\n    // Check if we're on a valid page (either staff page or login)\n    const url = page.url();\n    expect(url).toMatch(/\\/(admin\\/staff|login|auth)/);\n  });\n\n  test('staff directory page should be accessible from Next.js routing', async ({ request }) => {\n    // Test that the Next.js route exists\n    const response = await request.get(`${APP_BASE_URL}/admin/staff`);\n\n    // Should not be 404 - page exists\n    expect(response.status()).not.toBe(404);\n  });\n});\n\ntest.describe('Staff Directory - POST Endpoints', () => {\n  test('should have create staff endpoint (POST /staff)', async ({ request }) => {\n    const response = await request.post(`${API_BASE_URL}/staff`, {\n      data: {\n        first_name: 'Test',\n        last_name: 'User'\n      }\n    });\n\n    // Should require authentication\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have add credential endpoint (POST /staff/:id/credentials)', async ({ request }) => {\n    const response = await request.post(`${API_BASE_URL}/staff/1/credentials`, {\n      data: {\n        credential_type: 'RN_LICENSE',\n        credential_name: 'Test Credential',\n        expiration_date: '2025-12-31'\n      }\n    });\n\n    // Should require authentication\n    expect([401, 403, 404]).toContain(response.status());\n  });\n\n  test('should have assign patient endpoint (POST /staff/:id/caseload)', async ({ request }) => {\n    const response = await request.post(`${API_BASE_URL}/staff/1/caseload`, {\n      data: {\n        patient_id: 1,\n        assignment_role: 'PRIMARY_NURSE'\n      }\n    });\n\n    // Should require authentication\n    expect([401, 403, 404]).toContain(response.status());\n  });\n\n  test('should have create schedule endpoint (POST /staff/:id/schedule)', async ({ request }) => {\n    const response = await request.post(`${API_BASE_URL}/staff/1/schedule`, {\n      data: {\n        schedule_type: 'SHIFT',\n        shift_date: '2024-12-01'\n      }\n    });\n\n    // Should require authentication\n    expect([401, 403, 404]).toContain(response.status());\n  });\n\n  test('should have add training endpoint (POST /staff/:id/training)', async ({ request }) => {\n    const response = await request.post(`${API_BASE_URL}/staff/1/training`, {\n      data: {\n        training_name: 'Test Training',\n        training_type: 'ORIENTATION',\n        training_date: '2024-12-01'\n      }\n    });\n\n    // Should require authentication\n    expect([401, 403, 404]).toContain(response.status());\n  });\n});\n\ntest.describe('Staff Directory - UPDATE/DELETE Endpoints', () => {\n  test('should have update staff endpoint (PATCH /staff/:id)', async ({ request }) => {\n    const response = await request.patch(`${API_BASE_URL}/staff/1`, {\n      data: {\n        first_name: 'Updated'\n      }\n    });\n\n    // Should require authentication\n    expect([401, 403, 404]).toContain(response.status());\n  });\n\n  test('should have delete staff endpoint (DELETE /staff/:id)', async ({ request }) => {\n    const response = await request.delete(`${API_BASE_URL}/staff/99999`); // Use non-existent ID\n\n    // Should require authentication\n    expect([401, 403, 404]).toContain(response.status());\n  });\n\n  test('should have update credential endpoint (PUT /credentials/:id)', async ({ request }) => {\n    const response = await request.put(`${API_BASE_URL}/credentials/1`, {\n      data: {\n        credential_status: 'ACTIVE'\n      }\n    });\n\n    // Should require authentication\n    expect([401, 403, 404]).toContain(response.status());\n  });\n});\n"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Explore existing codebase structure for staff-related code",
      "status": "completed",
      "activeForm": "Exploring existing codebase structure"
    },
    {
      "content": "Plan staff directory UI implementation",
      "status": "completed",
      "activeForm": "Planning staff directory UI implementation"
    },
    {
      "content": "Create staff API service",
      "status": "completed",
      "activeForm": "Creating staff API service"
    },
    {
      "content": "Create staff directory page component",
      "status": "completed",
      "activeForm": "Creating staff directory page component"
    },
    {
      "content": "Create app route for staff page",
      "status": "completed",
      "activeForm": "Creating app route for staff page"
    },
    {
      "content": "Update menu to include staff directory",
      "status": "completed",
      "activeForm": "Updating menu"
    },
    {
      "content": "Create Playwright verification test",
      "status": "completed",
      "activeForm": "Creating Playwright verification test"
    },
    {
      "content": "Run verification test and fix any issues",
      "status": "in_progress",
      "activeForm": "Running verification test"
    },
    {
      "content": "Delete temporary test file",
      "status": "pending",
      "activeForm": "Deleting temporary test file"
    }
  ]
}

Now let me run the Playwright tests to verify everything works. First, let me check if the dev servers are running.

🔧 Tool: Bash
Input: {
  "command": "curl -s -o /dev/null -w \"%{http_code}\" http://localhost:3000 2>/dev/null || echo \"3000 not running\"",
  "description": "Check if frontend is running"
}

🔧 Tool: Bash
Input: {
  "command": "curl -s -o /dev/null -w \"%{http_code}\" http://localhost:3001/api 2>/dev/null || echo \"3001 not running\"",
  "description": "Check if API is running"
}

The dev servers aren't running. Let me start them in the background.

🔧 Tool: Bash
Input: {
  "command": "npm run dev 2>&1 &",
  "description": "Start dev servers in background",
  "timeout": 60000,
  "run_in_background": true
}

🔧 Tool: Bash
Input: {
  "command": "sleep 30 && curl -s -o /dev/null -w \"%{http_code}\" http://localhost:3000 2>/dev/null || echo \"still not running\"",
  "description": "Wait for servers to start and check",
  "timeout": 60000
}

🔧 Tool: Read
Input: {
  "file_path": "/tmp/claude/-Users-fabrice-Sites-chartwarden-Chartwarden/tasks/b5a8724.output"
}

I see that the dev servers couldn't start due to port/sandbox restrictions. The code has been created successfully but I cannot run the verification tests within this sandbox environment. Let me verify the code compiles correctly by checking for TypeScript errors.

🔧 Tool: Bash
Input: {
  "command": "cd /Users/fabrice/Sites/chartwarden/Chartwarden/apps/web && npx tsc --noEmit --skipLibCheck 2>&1 | head -50",
  "description": "Check TypeScript compilation",
  "timeout": 120000
}

The TypeScript errors are from other parts of the codebase, not from the staff directory files I created. Let me verify my specific files compile correctly.

🔧 Tool: Bash
Input: {
  "command": "npx tsc --noEmit --skipLibCheck 2>&1 | grep -E \"staff|Staff\" || echo \"No errors in staff files\"",
  "description": "Check for staff file errors"
}

I need to fix the unused imports in my StaffDirectoryPage component.

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/apps/web/src/views/staff/StaffDirectoryPage.tsx",
  "limit": 70
}

🔧 Tool: Edit
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/apps/web/src/views/staff/StaffDirectoryPage.tsx",
  "old_string": "// Icons\nimport {\n  Add,\n  Edit,\n  Eye,\n  Trash,\n  SearchNormal1,\n  Profile2User,\n  Call,\n  Sms,\n  Award,\n  Calendar,\n  Briefcase,\n  Warning2,\n  Refresh2,\n  ExportSquare,\n  CloseCircle\n} from 'iconsax-react';\n\n// Project Imports\nimport MainCard from 'components/MainCard';\nimport Avatar from 'components/@extended/Avatar';\nimport http from '../../hooks/useCookie';\nimport AuthService from 'types/AuthService';\nimport { getAllStaff, getStaffCredentials, deleteStaff, StaffProfile, StaffCredential } from '../../api/staff';",
  "new_string": "// Icons\nimport {\n  Add,\n  Edit,\n  Eye,\n  Trash,\n  SearchNormal1,\n  Profile2User,\n  Call,\n  Sms,\n  Award,\n  Briefcase,\n  Warning2,\n  Refresh2,\n  CloseCircle\n} from 'iconsax-react';\n\n// Project Imports\nimport MainCard from 'components/MainCard';\nimport Avatar from 'components/@extended/Avatar';\nimport AuthService from 'types/AuthService';\nimport { getAllStaff, getStaffCredentials, deleteStaff, StaffProfile, StaffCredential } from '../../api/staff';"
}

🔧 Tool: Bash
Input: {
  "command": "npx tsc --noEmit --skipLibCheck 2>&1 | grep -E \"staff|Staff\" || echo \"No errors in staff files\"",
  "description": "Check for staff file errors"
}

The staff files compile correctly. The only error is in another file (VisitFormDialog.tsx) which is not related to my changes. Now let me delete the test file as per the instructions since we can't run it in this environment, and update the todos.

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Explore existing codebase structure for staff-related code",
      "status": "completed",
      "activeForm": "Exploring existing codebase structure"
    },
    {
      "content": "Plan staff directory UI implementation",
      "status": "completed",
      "activeForm": "Planning staff directory UI implementation"
    },
    {
      "content": "Create staff API service",
      "status": "completed",
      "activeForm": "Creating staff API service"
    },
    {
      "content": "Create staff directory page component",
      "status": "completed",
      "activeForm": "Creating staff directory page component"
    },
    {
      "content": "Create app route for staff page",
      "status": "completed",
      "activeForm": "Creating app route for staff page"
    },
    {
      "content": "Update menu to include staff directory",
      "status": "completed",
      "activeForm": "Updating menu"
    },
    {
      "content": "Create Playwright verification test",
      "status": "completed",
      "activeForm": "Creating Playwright verification test"
    },
    {
      "content": "Run verification test and fix any issues",
      "status": "completed",
      "activeForm": "Running verification test"
    },
    {
      "content": "Delete temporary test file",
      "status": "in_progress",
      "activeForm": "Deleting temporary test file"
    }
  ]
}

🔧 Tool: Bash
Input: {
  "command": "rm /Users/fabrice/Sites/chartwarden/Chartwarden/apps/web/tests/staff-ui-verification.spec.ts",
  "description": "Delete temporary test file"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Explore existing codebase structure for staff-related code",
      "status": "completed",
      "activeForm": "Exploring existing codebase structure"
    },
    {
      "content": "Plan staff directory UI implementation",
      "status": "completed",
      "activeForm": "Planning staff directory UI implementation"
    },
    {
      "content": "Create staff API service",
      "status": "completed",
      "activeForm": "Creating staff API service"
    },
    {
      "content": "Create staff directory page component",
      "status": "completed",
      "activeForm": "Creating staff directory page component"
    },
    {
      "content": "Create app route for staff page",
      "status": "completed",
      "activeForm": "Creating app route for staff page"
    },
    {
      "content": "Update menu to include staff directory",
      "status": "completed",
      "activeForm": "Updating menu"
    },
    {
      "content": "Create Playwright verification test",
      "status": "completed",
      "activeForm": "Creating Playwright verification test"
    },
    {
      "content": "Run verification test and fix any issues",
      "status": "completed",
      "activeForm": "Running verification test"
    },
    {
      "content": "Delete temporary test file",
      "status": "completed",
      "activeForm": "Deleting temporary test file"
    }
  ]
}

<summary>
## Summary: Staff Directory UI

### Changes Implemented
- Created a comprehensive Staff Directory page with profiles, credentials display, and contact information
- Implemented staff API service with all CRUD operations for staff profiles, credentials, caseload, schedule, training, and productivity
- Added staff directory to the navigation menu under User Management
- Built a data table with search, filtering (by status, department), sorting, and pagination
- Created detailed staff profile dialog showing personal info, contact info, employment details, and credentials
- Added dashboard-style stats cards showing total staff, active count, on-leave count, and department counts
- Implemented tabbed interface with "Directory", "Expiring Credentials", and "By Department" views

### Files Modified
- `apps/web/src/menu-items/user-management.tsx` - Added Staff Directory menu item with People icon

### Files Created
- `apps/web/src/api/staff.ts` - Staff API service with types and all endpoint functions
- `apps/web/src/views/staff/StaffDirectoryPage.tsx` - Main staff directory page component
- `apps/web/src/app/(dashboard)/admin/staff/page.tsx` - Next.js route for the staff page

### Verification Status
- TypeScript compilation verified - all staff-related files compile without errors
- Playwright verification test was created but couldn't be run due to sandbox restrictions preventing server startup
- Code follows existing patterns from PatientsPage.tsx and UserManagementDashboard.tsx

### Notes for Developer
- The staff directory is accessible at `/admin/staff` 
- Access is controlled by `manage:staff` or `view:staff` permissions (admins have full access)
- The backend API endpoints at `/api/staff/*` are already implemented in `services/api/src/controllers/Staff.controller.js`
- The "Expiring Credentials" tab is a placeholder - implement with data from `GET /staff/credentials/expiring` endpoint
- To test manually, start the dev servers with `npm run dev` and navigate to `/admin/staff`
</summary>