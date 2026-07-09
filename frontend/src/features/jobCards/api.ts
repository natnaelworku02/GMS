import { api } from "@/lib/api";
import type { PaginatedResponse } from "@/types/api";
import type {
  Employee,
  EmployeeCreateDTO,
  EmployeeUpdateDTO,
  JobCard,
  JobCardCreateDTO,
  JobCardUpdateDTO,
  Owner,
  OwnerCreateDTO,
  OwnerUpdateDTO,
  Vehicle,
  VehicleCreateDTO,
} from "./types";

export const jobCardsApi = api.injectEndpoints({
  endpoints: (build) => ({
    // --- Owners ---
    getOwners: build.query<PaginatedResponse<Owner>, { page?: number; page_size?: number; search?: string } | void>({
      query: (params) => ({ url: "/owners/", params: params || undefined }),
      providesTags: ["Owners"],
    }),
    getOwner: build.query<Owner, string>({
      query: (id) => `/owners/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Owners", id }],
    }),
    createOwner: build.mutation<Owner, OwnerCreateDTO>({
      query: (body) => ({ url: "/owners/", method: "POST", body }),
      invalidatesTags: ["Owners"],
    }),
    updateOwner: build.mutation<Owner, { id: string; body: OwnerUpdateDTO }>({
      query: ({ id, body }) => ({ url: `/owners/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Owners"],
    }),

    // --- Vehicles ---
    getVehicles: build.query<PaginatedResponse<Vehicle>, {
      page?: number; page_size?: number; search?: string; owner_id?: string;
    } | void>({
      query: (params) => ({ url: "/vehicles/", params: params || undefined }),
      providesTags: ["Vehicles"],
    }),
    getVehicle: build.query<Vehicle, string>({
      query: (id) => `/vehicles/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Vehicles", id }],
    }),
    createVehicle: build.mutation<Vehicle, VehicleCreateDTO>({
      query: (body) => ({ url: "/vehicles/", method: "POST", body }),
      invalidatesTags: ["Vehicles"],
    }),

    // --- Job Cards ---
    getJobCards: build.query<PaginatedResponse<JobCard>, {
      page?: number; page_size?: number; search?: string; status?: string;
      owner_id?: string; vehicle_id?: string; date_from?: string; date_to?: string;
    } | void>({
      query: (params) => ({ url: "/job-cards/", params: params || undefined }),
      providesTags: ["JobCards"],
    }),
    getJobCard: build.query<JobCard, string>({
      query: (id) => `/job-cards/${id}`,
      providesTags: (_r, _e, id) => [{ type: "JobCards", id }],
    }),
    createJobCard: build.mutation<JobCard, JobCardCreateDTO>({
      query: (body) => ({ url: "/job-cards/", method: "POST", body }),
      invalidatesTags: ["JobCards"],
    }),
    updateJobCard: build.mutation<JobCard, { id: string; body: JobCardUpdateDTO }>({
      query: ({ id, body }) => ({ url: `/job-cards/${id}`, method: "PATCH", body }),
      invalidatesTags: ["JobCards"],
    }),
    updateJobCardStatus: build.mutation<JobCard, { id: string; status: string }>({
      query: ({ id, status }) => ({
        url: `/job-cards/${id}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: ["JobCards"],
    }),

    // --- Employees ---
    getEmployees: build.query<PaginatedResponse<Employee>, {
      page?: number; page_size?: number; search?: string; active_only?: boolean;
    } | void>({
      query: (params) => ({ url: "/hr/employees/", params: params || undefined }),
      providesTags: ["Employees"],
    }),
    getEmployee: build.query<Employee, string>({
      query: (id) => `/hr/employees/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Employees", id }],
    }),
    createEmployee: build.mutation<Employee, EmployeeCreateDTO>({
      query: (body) => ({ url: "/hr/employees/", method: "POST", body }),
      invalidatesTags: ["Employees"],
    }),
    updateEmployee: build.mutation<Employee, { id: string; body: EmployeeUpdateDTO }>({
      query: ({ id, body }) => ({ url: `/hr/employees/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Employees"],
    }),
  }),
});

export const {
  useGetOwnersQuery,
  useGetOwnerQuery,
  useCreateOwnerMutation,
  useUpdateOwnerMutation,
  useGetVehiclesQuery,
  useGetVehicleQuery,
  useCreateVehicleMutation,
  useGetJobCardsQuery,
  useGetJobCardQuery,
  useCreateJobCardMutation,
  useUpdateJobCardMutation,
  useUpdateJobCardStatusMutation,
  useGetEmployeesQuery,
  useGetEmployeeQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
} = jobCardsApi;
