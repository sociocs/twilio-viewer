export interface Connection {
  account_sid: string;
  auth_token: string;
  name: string;
  friendly_name?: string;
  in_use: boolean;
  status: string;
  created_at: number;
  saved_at: number;
  owner_account_sid?: string;
}

export interface Subaccount {
  sid: string;
  owner_account_sid: string;
  name: string;
  status: string;
  created_at: number;
  loaded_at: number;
  auth_token?: string;
}

export interface AuthCredentials {
  account_sid: string;
  auth_token: string;
}

export interface TwilioAccountRaw {
  sid: string;
  friendly_name: string;
  status: string;
  type: string;
  date_created: string;
  date_updated: string;
  owner_account_sid: string;
  subresource_uris?: Record<string, string>;
  auth_token?: string;
}

export interface AccountValidationResult {
  account: TwilioAccountRaw;
  subaccountsCount: number;
}

export interface TwilioMessagingService {
  sid: string;
  account_sid: string;
  friendly_name: string;
  date_created: string;
  date_updated: string;
  inbound_request_url?: string;
  inbound_method?: string;
  fallback_url?: string;
  fallback_method?: string;
  status_callback?: string;
  sticky_sender: boolean;
  mms_converter: boolean;
  smart_encoding: boolean;
  fallback_to_long_code: boolean;
  area_code_geomatch: boolean;
  validity_period: number;
  usecase?: string;
  us_app_to_person_registered: boolean;
  use_inbound_webhook_on_number: boolean;
  url: string;
}

export interface TwilioA2PCompliance {
  sid?: string;
  account_sid?: string;
  brand_registration_sid?: string;
  messaging_service_sid?: string;
  description?: string;
  message_samples?: string[];
  us_app_to_person_usecase?: string;
  has_embedded_links?: boolean;
  has_embedded_phone?: boolean;
  subscriber_opt_in?: boolean;
  subscriber_opt_out?: boolean;
  subscriber_help?: boolean;
  age_gated?: boolean;
  direct_lending?: boolean;
  campaign_status?: string;
  campaign_id?: string;
  is_externally_registered?: boolean;
  date_created?: string;
  date_updated?: string;
  help_keywords?: string[];
  help_message?: string;
  message_flow?: string;
  opt_in_keywords?: string[];
  opt_in_message?: string | null;
  opt_out_keywords?: string[];
  opt_out_message?: string | null;
  mock?: boolean;
  rate_limits?: {
    att?: {
      mps?: number;
      msg_class?: string;
    };
    tmobile?: {
      brand_tier?: string;
    };
    [key: string]: unknown;
  };
  errors?: Array<{ code?: number; message?: string; description?: string }>;
  url?: string;
}

export interface TwilioServicePhoneNumber {
  sid: string;
  account_sid: string;
  service_sid: string;
  date_created: string;
  date_updated: string;
  phone_number: string;
  country_code: string;
  capabilities: string[];
  url: string;
}

export interface TwilioTollfreeVerification {
  sid: string;
  account_sid: string;
  tollfree_phone_number_sid: string;
  tollfree_phone_number: string;
  customer_profile_sid?: string;
  business_name?: string;
  business_website?: string;
  notification_email?: string;
  use_case?: string;
  use_case_summary?: string;
  production_message_sample?: string;
  status: string;
  rejection_reason?: string | null;
  rejection_reasons?: string[] | null;
  error_code?: number | null;
  date_created?: string;
  date_updated?: string;
  url: string;
}

export interface EnrichedMessagingService extends TwilioMessagingService {
  a2pCompliance?: TwilioA2PCompliance | null;
  phoneNumbers?: TwilioServicePhoneNumber[];
  tollfreeVerifications?: TwilioTollfreeVerification[];
  isLoadingDetails?: boolean;
}

export interface TwilioPhoneNumberCapabilities {
  mms?: boolean;
  sms?: boolean;
  voice?: boolean;
  fax?: boolean;
}

export interface TwilioIncomingPhoneNumber {
  sid: string;
  account_sid: string;
  friendly_name: string;
  phone_number: string;
  voice_url?: string;
  voice_method?: string;
  voice_fallback_url?: string;
  voice_fallback_method?: string;
  sms_url?: string;
  sms_method?: string;
  sms_fallback_url?: string;
  sms_fallback_method?: string;
  status_callback?: string;
  status_callback_method?: string;
  capabilities: TwilioPhoneNumberCapabilities;
  status?: string;
  date_created: string;
  date_updated: string;
  sms_application_sid?: string;
  voice_application_sid?: string;
  trunk_sid?: string | null;
  emergency_status?: string;
  emergency_address_sid?: string | null;
  emergency_address_status?: string;
  address_sid?: string | null;
  identity_sid?: string | null;
  address_requirements?: string;
  origin?: string;
  bundle_sid?: string | null;
  uri?: string;
  voice_caller_id_lookup?: boolean;
}

export interface LinkedMessagingServiceRef {
  sid: string;
  friendly_name: string;
  usecase?: string;
}

export interface EnrichedIncomingPhoneNumber extends TwilioIncomingPhoneNumber {
  linkedMessagingServices?: LinkedMessagingServiceRef[];
  tollfreeVerification?: TwilioTollfreeVerification | null;
  isLoadingDetails?: boolean;
}

export interface TwilioMediaItem {
  sid: string;
  account_sid: string;
  parent_sid: string;
  content_type: string;
  date_created: string;
  date_updated: string;
  uri: string;
  link?: string;
  blobUrl?: string;
}

export interface TwilioMessageSubresourceUris {
  media?: string;
  feedback?: string;
}

export interface TwilioMessage {
  sid: string;
  account_sid: string;
  messaging_service_sid?: string | null;
  from: string;
  to: string;
  body: string;
  status: string;
  num_segments: string | number;
  num_media: string | number;
  direction: string;
  api_version?: string;
  price?: string | null;
  price_unit?: string | null;
  error_code?: number | null;
  error_message?: string | null;
  uri: string;
  subresource_uris?: TwilioMessageSubresourceUris;
  date_created: string;
  date_sent: string;
  date_updated: string;
}

export interface EnrichedTwilioMessage extends TwilioMessage {
  mediaList?: TwilioMediaItem[];
  isLoadingMedia?: boolean;
  friendlyServiceName?: string | null;
  isFromOurNumber?: boolean;
  isToOurNumber?: boolean;
}

export interface TwilioMessagesResponse {
  messages: TwilioMessage[];
  first_page_uri?: string | null;
  next_page_uri?: string | null;
  previous_page_uri?: string | null;
  page?: number;
  page_size?: number;
}

export interface TwilioCallSubresourceUris {
  notifications?: string;
  recordings?: string;
  feedback?: string;
  feedback_summaries?: string;
  payments?: string;
  events?: string;
  siprec?: string;
  user_defined_message_subscriptions?: string;
}

export interface TwilioCallRecording {
  sid: string;
  account_sid: string;
  call_sid: string;
  conference_sid?: string | null;
  date_created: string;
  date_updated: string;
  start_time: string;
  duration: string | number;
  price?: string | null;
  price_unit?: string | null;
  status: string;
  channels: number;
  source: string;
  error_code?: number | null;
  uri: string;
  audioBlobUrl?: string;
}

export interface TwilioCall {
  sid: string;
  account_sid: string;
  parent_call_sid?: string | null;
  to: string;
  to_formatted?: string;
  from: string;
  from_formatted?: string;
  phone_number_sid?: string | null;
  status: string;
  start_time: string;
  end_time?: string | null;
  duration?: string | null;
  price?: string | null;
  price_unit?: string | null;
  direction: string;
  answered_by?: string | null;
  api_version?: string;
  annotation?: string | null;
  forwarded_from?: string | null;
  group_sid?: string | null;
  caller_name?: string | null;
  queue_time?: string | null;
  trunk_sid?: string | null;
  uri: string;
  subresource_uris?: TwilioCallSubresourceUris;
  date_created: string;
  date_updated: string;
}

export interface EnrichedTwilioCall extends TwilioCall {
  recordings?: TwilioCallRecording[];
  isLoadingRecordings?: boolean;
  isFromOurNumber?: boolean;
  isToOurNumber?: boolean;
}

export interface TwilioCallsResponse {
  calls: TwilioCall[];
  first_page_uri?: string | null;
  next_page_uri?: string | null;
  previous_page_uri?: string | null;
  page?: number;
  page_size?: number;
}

export interface TwilioAlert {
  sid: string;
  account_sid: string;
  resource_sid?: string | null;
  date_created: string;
  date_generated: string;
  date_updated: string;
  error_code?: string | null;
  log_level: "error" | "warning" | "notice" | "debug" | string;
  more_info?: string | null;
  alert_text?: string | null;
  request_method?: string | null;
  request_url?: string | null;
  request_variables?: string | null;
  response_body?: string | null;
  response_headers?: string | null;
  service_sid?: string | null;
  url: string;
}

export interface AlertTextToken {
  label: string;
  value?: string;
}

export interface EnrichedTwilioAlert extends TwilioAlert {
  resourceType?: "message" | "call" | "number" | "service" | "unknown";
  resourceLink?: string;
  parsedTokens?: AlertTextToken[];
}

export interface TwilioMonitorMeta {
  first_page_url?: string | null;
  next_page_url?: string | null;
  previous_page_url?: string | null;
  page?: number;
  page_size?: number;
  key?: string;
  url?: string;
}

export interface TwilioAlertsResponse {
  alerts: TwilioAlert[];
  meta: TwilioMonitorMeta;
}

export interface TwilioAuditEvent {
  sid: string;
  account_sid: string;
  actor_sid?: string | null;
  actor_type?: string | null;
  description?: string | null;
  event_data?: Record<string, unknown> | null;
  event_date: string;
  event_type: string;
  resource_sid?: string | null;
  resource_type?: string | null;
  source?: string | null;
  source_ip_address?: string | null;
  url: string;
}

export interface TwilioAuditEventsResponse {
  events: TwilioAuditEvent[];
  meta: TwilioMonitorMeta;
}

export interface TwilioAccountBalance {
  account_sid: string;
  balance: string;
  currency: string;
}

export interface TwilioUsageRecord {
  account_sid: string;
  category: string;
  description: string;
  start_date: string;
  end_date: string;
  count: string;
  count_unit: string;
  usage: string;
  usage_unit: string;
  price: string;
  price_unit: string;
  as_of?: string;
  subresource_uris?: Record<string, string>;
  uri?: string;
}

export interface BillingCategoryConfig {
  category_desc: string;
  group: string;
  level: number;
  order: number;
  ignore?: boolean;
  parentCategory?: string;
}

export interface EnrichedUsageRecord extends TwilioUsageRecord, BillingCategoryConfig {
  isBreakdownOfPresentParent?: boolean;
}

export interface UsageGroup {
  group: string;
  totalPrice: number;
  currency: string;
  hasBreakdownItems?: boolean;
  children: EnrichedUsageRecord[];
}

export interface TwilioUsageRecordsResponse {
  usage_records: TwilioUsageRecord[];
  first_page_uri?: string;
  next_page_uri?: string;
  previous_page_uri?: string;
  page?: number;
  page_size?: number;
  total_records?: number;
}
