export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: any;
  errorCode?: string | null;
}

export interface PagedResult<T> {
  data: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export enum RoleType {
  OrgAdmin = 1,
  Custom = 2,
  Auditor = 3,
}

export enum RentFrequency {
  Day = 1,
  Week = 2,
  Fortnight = 3,
  Month = 4,
  Quarter = 5,
  Year = 6,
}

export enum PropertyType {
  Residential = 1,
  Office = 2,
  RetailShop = 3,
  Factory = 4,
  Building = 5,
  Commercial = 6,
  Industrial = 7,
}

export enum MediaType {
  Photo = 1,
  Video = 2,
}

export enum InspectionType {
  Entry = 1,
  Exit = 2,
  Routine = 3,
}

export enum InspectionStatus {
  Pending = 1,
  InProgress = 2,
  InSync = 3,
  Completed = 4,
  Closed = 5,
}

export enum InspectionFrequencyType {
  Day = 1,
  Week = 2,
  Month = 3,
  Year = 4,
}

export interface BaseEntityDto {
  id: string;
  createdAt: string;
  createdBy: string;
  updatedAt?: string | null;
  updatedBy?: string | null;
  isDeleted: boolean;
  deletedBy?: string | null;
  deletedAt?: string | null;
  isActive: boolean;
}

export interface PermissionDto {
  id: string;
  name: string;
  description: string;
  module: string;
}

export interface UserRoleDto {
  id: string;
  roleName: string;
  permissions?: PermissionDto[] | null;
}

export interface UserResponse extends BaseEntityDto {
  identityUserId: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImage: string;
  agencyId?: string | null;
  agencyName?: string | null;
  isSuperAdmin: boolean;
  isAgencyAdmin: boolean;
  userRoles?: UserRoleDto[] | null;
}

export interface UserInfo {
  identityUserId: string;
  domainUserId: string;
  email: string;
  fullName: string;
  isSuperAdmin: boolean;
  roles: string[];
  agencyId: string | null;
  agencyName: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImage?: string | null;
  isAgencyAdmin?: boolean | null;
}

export interface BillingFeatureDto {
  id: string;
  name: string;
}

export type BillingStatus = 'active' | 'inactive';

export interface BillingPlan {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  status: BillingStatus;
  createdDate: string;
  features: BillingFeatureDto[];
  userLimits: number;
  trialDays: number;
  propertiesLimit: number | null;
  inspectionsLimit: number | null;
}

export interface CreateBillingPlanRequest {
  name: string;
  description?: string | null;
  priceMonthly: number;
  priceYearly: number;
  status: BillingStatus;
  features: BillingFeatureDto[];
  userLimits: number;
  trialDays: number;
  propertiesLimit: number | null;
  inspectionsLimit: number | null;
}

export interface UpdateBillingPlanRequest {
  name?: string | null;
  description?: string | null;
  priceMonthly?: number | null;
  priceYearly?: number | null;
  status?: BillingStatus;
  features?: BillingFeatureDto[] | null;
  userLimits?: number | null;
  trialDays?: number | null;
  propertiesLimit?: number | null;
  inspectionsLimit?: number | null;
}

export interface BillingPlanFilter {
  search?: string;
  status?: BillingStatus | 'all';
  minPrice?: number;
  maxPrice?: number;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface LoginResultDto {
  token: string;
  user: UserInfo;
}

export type LoginResponseDto = ApiResponse<LoginResultDto>;

export interface CountryDto {
  id: string;
  name: string;
  isoAlpha3: string;
  isoAlpha2: string;
}

// Frontend lookup DTOs built from backend lookup responses
// These are lightweight view models used across the UI.
export interface StateDto {
  id: string | number;
  name: string;
  countryId?: string | number | null;
  country?: CountryLookupDto | null;
}

export interface TimeZoneDto {
  id: string | number;
  displayName: string;
  timeZoneId: string;
  countryId?: string | number | null;
}

export interface PropertyTypeDto {
  propertyTypeId: number;
  name: string;
  description?: string | null;
}

export interface InspectionTypeDto {
  id: number;
  inspectionTypeId: number;
  name: string;
}

export interface InspectionStatusDto {
  id: number;
  inspectionStatusId: number;
  name: string;
}

export interface CountryLookupDto {
  id: string;
  name: string;
  isoAlpha3: string;
  isoAlpha2: string;
}

export interface StateLookupDto {
  id: string;
  name: string;
  countryId: string;
  country?: CountryLookupDto | null;
}

export interface TimeZoneLookupDto {
  id: string;
  displayName: string;
  timeZoneId: string;
  countryId?: string | null;
  country?: CountryLookupDto | null;
}

export interface LookupDto {
  id: number;
  name: string;
}

export interface AgencyWhitelabelResponse {
  id: string;
  agencyId: string;
  agencyNameColor: string;
  addressColor: string;
  accentColor?: string | null;
  accentFontFamily?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  fontFamily?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface WhitelabelBrandingDto {
  agencyNameColor: string;
  addressColor: string;
  accentColor?: string | null;
  accentFontFamily?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  fontFamily?: string | null;
}

export interface DefaultWhitelabelDto {
  agencyNameColor: string;
  addressColor: string;
  accentColor?: string | null;
  accentFontFamily?: string | null;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
}

export interface WhitelabelReportSettingsDto {
  agencyNameColor: string;
  addressColor: string;
  accentColor?: string | null;
  accentFontFamily?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  fontFamily?: string | null;
}

export interface AgencyResponse extends BaseEntityDto {
  legalBusinessName: string;
  address: string;
  suburb?: string | null;
  city?: string | null;
  countryId?: string | null;
  country?: CountryLookupDto | null;
  stateId?: string | null;
  state?: StateLookupDto | null;
  postcode?: string | null;
  phoneNumber?: string | null;
  faxNumber?: string | null;
  timeZoneId?: string | null;
  timeZone?: TimeZoneLookupDto | null;
  companyWebsite?: string | null;
  contactPersonFirstName?: string | null;
  contactPersonLastName?: string | null;
  contactPersonPhone?: string | null;
  contactPersonFaxNumber?: string | null;
  contactPersonJobTitle?: string | null;
  contactPersonEmail?: string | null;
  billingContactFirstName?: string | null;
  billingContactLastName?: string | null;
  billingPhoneNumber?: string | null;
  billingContactJobTitle?: string | null;
  billingFaxNumber?: string | null;
  billingContactEmail?: string | null;
  technicalContactFirstName?: string | null;
  technicalContactLastName?: string | null;
  technicalPhoneNumber?: string | null;
  technicalContactJobTitle?: string | null;
  technicalContactFaxNumber?: string | null;
  technicalContactEmail?: string | null;
  agencyWhitelabel?: AgencyWhitelabelResponse | null;
}

export interface CreateAgencyRequest {
  legalBusinessName: string;
  companyWebsite?: string | null;
  address: string;
  suburb?: string | null;
  city?: string | null;
  countryId?: string | null;
  stateId?: string | null;
  postcode?: string | null;
  phoneNumber?: string | null;
  faxNumber?: string | null;
  timeZoneId?: string | null;
  adminUsername: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPassword: string;
  contactPersonFirstName?: string | null;
  contactPersonLastName?: string | null;
  contactPersonPhone?: string | null;
  contactPersonJobTitle?: string | null;
  contactPersonFaxNumber?: string | null;
  contactPersonEmail?: string | null;
  billingContactFirstName?: string | null;
  billingContactLastName?: string | null;
  billingPhoneNumber?: string | null;
  billingContactJobTitle?: string | null;
  billingFaxNumber?: string | null;
  billingContactEmail?: string | null;
  technicalContactFirstName?: string | null;
  technicalContactLastName?: string | null;
  technicalPhoneNumber?: string | null;
  technicalContactJobTitle?: string | null;
  technicalContactFaxNumber?: string | null;
  technicalContactEmail?: string | null;
}

export interface UpdateAgencyRequest {
  name: string;
  legalBusinessName: string;
  companyWebsite?: string | null;
  address: string;
  suburb?: string | null;
  city?: string | null;
  countryId?: string | null;
  stateId?: string | null;
  postcode?: string | null;
  phoneNumber?: string | null;
  faxNumber?: string | null;
  timeZoneId?: string | null;
  contactPersonFirstName?: string | null;
  contactPersonLastName?: string | null;
  contactPersonPhone?: string | null;
  contactPersonJobTitle?: string | null;
  contactPersonFaxNumber?: string | null;
  contactPersonEmail?: string | null;
  billingContactFirstName?: string | null;
  billingContactLastName?: string | null;
  billingPhoneNumber?: string | null;
  billingContactJobTitle?: string | null;
  billingFaxNumber?: string | null;
  billingContactEmail?: string | null;
  technicalContactFirstName?: string | null;
  technicalContactLastName?: string | null;
  technicalPhoneNumber?: string | null;
  technicalContactJobTitle?: string | null;
  technicalContactFaxNumber?: string | null;
  technicalContactEmail?: string | null;
}

export interface LandlordDto extends BaseEntityDto {
  propertyId: string;
  name: string;
  email: string;
  phone?: string | null;
}

export interface TenantDto extends BaseEntityDto {
  tenancyId: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  rentReviewDate?: string | null;
  rentReviewNotes?: string | null;
}

export interface TenancyDto extends BaseEntityDto {
  propertyId: string;
  fullName: string;
  email: string;
  mobile?: string | null;
  leaseStartDate: string;
  leaseEndDate: string;
  currentRentAmount: number;
  rentFrequency: RentFrequency;
  originalLeaseDate?: string | null;
  tenantVacateDate?: string | null;
  newInspectionDate?: string | null;
  tenants: TenantDto[];
}

export interface PropertyLayoutResponse extends BaseEntityDto {
  agencyId?: string | null;
  layoutType: PropertyType;
  name: string;
  displayOrder: number;
  agency?: AgencyResponse | null;
  layoutArea: LayoutAreaResponse[];
}

export interface LayoutAreaResponse extends BaseEntityDto {
  layoutId?: string | null;
  areaName: string;
  displayOrder: number;
  layoutItem: LayoutItemResponse[];
}

export interface LayoutItemResponse extends BaseEntityDto {
  areaId?: string | null;
  itemName: string;
  displayOrder: number;
}

export interface CreatePropertyLayoutRequest {
  agencyId?: string | null;
  layoutType: PropertyType;
  name: string;
  displayOrder: number;
  layoutArea: CreateLayoutAreaRequest[];
}

export interface CreateLayoutAreaRequest {
  areaName: string;
  displayOrder: number;
  layoutItem: CreateLayoutItemRequest[];
}

export interface CreateLayoutItemRequest {
  itemName: string;
  displayOrder: number;
}

export interface UpdatePropertyLayoutRequest {
  id: string;
  agencyId?: string | null;
  layoutType: PropertyType;
  name: string;
  displayOrder: number;
  layoutArea: UpdateLayoutAreaRequest[];
}

export interface UpdateLayoutAreaRequest {
  id: string;
  areaName: string;
  displayOrder: number;
  layoutItem: UpdateLayoutItemRequest[];
}

export interface UpdateLayoutItemRequest {
  id: string;
  itemName: string;
  displayOrder: number;
}

export interface PropertyResponse extends BaseEntityDto {
  agencyId?: string | null;
  name: string;
  type: PropertyType;
  propertyManagerId: string;
  address1: string;
  address2?: string | null;
  cityOrSuburb: string;
  stateLookupId: string;
  postcode: string;
  inspectionFrequencyType: InspectionFrequencyType;
  inspectionFrequencyNumber: number;
  keyNo?: string | null;
  alarmCode?: string | null;
  propertyNotes?: string | null;
  propertyImages?: string | null;
  propertyLayoutId: string;
  propertyManagerName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  agency?: AgencyResponse | null;
  propertyManager?: UserResponse | null;
  state?: StateLookupDto | null;
  propertyLayout?: PropertyLayoutResponse | null;
  landlords: LandlordDto[];
  tenancies: TenancyDto[];
}

export interface PropertyRequestBase {
  agencyId?: string | null;
  name: string;
  type: PropertyType;
  propertyManagerId: string;
  address1: string;
  address2?: string | null;
  cityOrSuburb: string;
  stateLookupId: string;
  postcode: string;
  inspectionFrequencyType: InspectionFrequencyType;
  inspectionFrequencyNumber: number;
  keyNo?: string | null;
  alarmCode?: string | null;
  propertyNotes?: string | null;
  propertyImages?: string | null;
  propertyLayoutId: string;
  latitude?: number | null;
  longitude?: number | null;
  landlords: LandlordDto[];
  tenancies: TenancyDto[];
}

export interface CreatePropertyRequest extends PropertyRequestBase {}

export interface UpdatePropertyRequest extends PropertyRequestBase {
  id: string;
}

export interface LandlordSnapshotDto extends BaseEntityDto {
  propertyId: string;
  name: string;
  email: string;
  phone?: string | null;
}

export interface TenancySnapshotDto extends BaseEntityDto {
  propertyId: string;
  fullName: string;
  email: string;
  mobile?: string | null;
  leaseStartDate: string;
  leaseEndDate: string;
  currentRentAmount: number;
  rentFrequency: RentFrequency;
  originalLeaseDate?: string | null;
  tenantVacateDate?: string | null;
  newInspectionDate?: string | null;
}

export interface InspectionResponse {
  id: string;
  agencyId: string;
  propertyId: string;
  propertyAddress: string;
  propertySubhurb: string;
  inspectorId: string;
  inspectorName: string;
  inspectionType: InspectionType;
  inspectionStatus: InspectionStatus;
  inspectionDate: string;
  inspectionTime: string;
  property?: PropertyResponse | null;
  agency?: AgencyResponse | null;
  inspector?: UserResponse | null;
  isActive: boolean;
  landlordSnapshots?: LandlordSnapshotDto[] | null;
  tenancySnapshots?: TenancySnapshotDto[] | null;
}

export interface CreateInspectionRequest {
  propertyId: string;
  agencyId?: string | null;
  inspectionType: InspectionType;
  inspectionStatus: InspectionStatus;
  inspectorId: string;
  //address: string;
  inspectionDate: string;
  inspectionTime: string;
}

export interface UpdateInspectionRequest {
  id: string;
  agencyId?: string | null;
  propertyId: string;
  inspectionType: InspectionType;
  inspectionStatus: InspectionStatus;
  inspectorId: string;
  address?: string | null;
  inspectionDate: string;
  inspectionTime: string;
}

export interface RecentInspectionDto {
  propertyAddress: string;
  inspectorName: string;
  date: string;
  status: string;
}

export interface UpcomingInspectionDto {
  propertyAddress: string;
  inspectorName: string;
  scheduledDateTime: string;
}

export interface MonthlyInspectionDto {
  month: number;
  year: number;
  total: number;
}

export interface InspectionTypeDistributionDto {
  type: string;
  count: number;
}

export interface TopSuburbDto {
  suburbName: string;
  count: number;
}

export interface AnalyticsDto {
  totalProperties: number;
  totalPropertiesChangePercent: number;
  completedInspections: number;
  completedInspectionsChangePercent: number;
  pendingInspections: number;
  pendingInspectionsChangePercent: number;
  reportsGenerated: number;
  reportsGeneratedChangePercent: number;
  recentInspections: RecentInspectionDto[];
  upcomingInspections: UpcomingInspectionDto[];
  monthlyInspections: MonthlyInspectionDto[];
  inspectionsByType: InspectionTypeDistributionDto[];
  topSuburbs: TopSuburbDto[];
}

export interface NotificationAgencyUserDto {
  agencyId: string;
  agencyName: string;
  users: AgencyUserDto[];
}

export interface AgencyUserDto {
  userId: string;
  userName: string;
  fullname: string;
}

export interface UserNotificationDto {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdDate: string;
}

export interface CreateNotificationDto {
  title: string;
  message: string;
  userIds: string[];
}

export interface SearchPropertyDto {
  id: string;
  address: string;
  suburb: string;
}

export interface SearchResultDto {
  type: string;
  id: string;
  address1: string;
  address2: string;
  subhurb: string;
  tenantName: string;
  landlordName: string;
  inspectionDate?: string | null;
  inspectionType: InspectionType;
}

export interface SearchResultGroupedDto {
  properties: SearchResultDto[];
  inspections: SearchResultDto[];
}

export interface ReportMediaCommentDto {
  id: string;
  reportMediaId: string;
  text: string;
  x?: number | null;
  y?: number | null;
}

export interface ReportMediaDto {
  id: string;
  reportItemId: string;
  url: string;
  type: MediaType;
  reportMediaComments: ReportMediaCommentDto[];
}

export interface ReportItemCommentDto {
  id: string;
  reportItemId: string;
  text: string;
}

export interface ReportItemConditionDto {
  id: string;
  reportItemId: string;
  description: string;
  value?: string | null;
}

export interface ReportItemDto {
  id: string;
  reportAreaId: string;
  name: string;
  reportItemConditions: ReportItemConditionDto[];
  reportItemComments: ReportItemCommentDto[];
  reportMedia: ReportMediaDto[];
}

export interface ReportAreaDto {
  id: string;
  reportId: string;
  name: string;
  reportItems: ReportItemDto[];
}

export interface ReportDto extends BaseEntityDto {
  inspectionId: string;
  reportType: string;
  notes?: string | null;
  inspection?: InspectionResponse | null;
  reportAreas: ReportAreaDto[];
}

export interface ReportTemplateDto {
  reportId: string;
  inspectionId: string;
  reportType: string;
  notes: string;
  createdAt: string;
  reportAreas: ReportTemplateAreaDto[];
}

export interface ReportTemplateAreaDto {
  reportAreaId: string;
  name: string;
  reportItems: ReportTemplateItemDto[];
}

export interface ReportTemplateItemDto {
  reportItemId: string;
  name: string;
  reportItemConditions: ReportTemplateItemConditionDto[];
  reportItemComments: ReportTemplateItemCommentDto[];
  reportMedia: ReportTemplateMediaDto[];
}

export interface ReportTemplateItemConditionDto {
  reportItemConditionId: string;
  reportItemId: string;
  description: string;
  value: string;
}

export interface ReportTemplateItemCommentDto {
  reportItemCommentId: string;
  reportItemId: string;
  text: string;
}

export interface ReportTemplateMediaDto {
  reportMediaId: string;
  reportItemId: string;
  url: string;
  type: string;
  reportMediaComments: ReportTemplateMediaCommentDto[];
}

export interface ReportTemplateMediaCommentDto {
  reportMediaCommentId: string;
  reportMediaId: string;
  text: string;
  x?: number | null;
  y?: number | null;
}

export interface AddAgencyUsers {
  username: string;
  email: string;
  password: string;
  role: string;
}

export interface UpdateRoleDto {
  userId: string;
  username: string;
  email: string;
  passwordHash: string;
  profileImage?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  role: string;
}

// ---------------------------------------------------------------------------
// User management DTOs (aligned with backend User APIs)
// ---------------------------------------------------------------------------

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  agencyId?: string | null;
  roleIds: string[];
  isAgencyAdmin?: boolean | null;
}

export interface UpdateUserRequest {
  firstName: string;
  lastName: string;
  agencyId?: string | null;
  roleIds: string[];
}

// (Legacy *Dto alias types have been removed; use the canonical
//  backend-aligned types such as AgencyResponse, CreateAgencyRequest,
//  PropertyResponse, CreatePropertyRequest, InspectionResponse,
//  CreateInspectionRequest, PropertyLayoutResponse, LayoutAreaResponse,
//  and LayoutItemResponse directly instead.)
