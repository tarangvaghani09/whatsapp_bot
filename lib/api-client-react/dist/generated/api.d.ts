import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { AiUsageListResponse, Booking, BookingListResponse, BroadcastBody, BroadcastResult, BroadcastToCustomersParams, Business, BusinessSettings, CannedResponse, CannedResponseBody, CreateBookingBody, CreateBookingParams, CreateBusinessBody, CreateCannedResponseParams, CreateFaqBody, CreateFaqParams, CreateServiceBody, CreateServiceParams, CustomerDetail, CustomerListResponse, CustomerStats, DashboardStats, DeleteBookingParams, DeleteCannedResponseParams, DeleteFaqParams, DeleteServiceParams, Faq, GetCustomerParams, GetCustomerStatsParams, GetDashboardStatsParams, GetSettingsParams, HealthStatus, ListAiUsageParams, ListBookingsParams, ListCannedResponsesParams, ListCustomersParams, ListFaqsParams, ListMessagesParams, ListServicesParams, MessageListResponse, PatchCustomerTagsBody, PatchCustomerTagsParams, QuickReplyBody, QuickReplyResult, ReceiveWebhookBody, SendQuickReplyParams, Service, SimulateMessageBody, SimulateMessageParams, SimulateMessageResponse, UpdateBookingBody, UpdateBookingParams, UpdateBusinessBody, UpdateCannedResponseParams, UpdateFaqBody, UpdateFaqParams, UpdateServiceBody, UpdateServiceParams, UpdateSettingsBody, UpdateSettingsParams, VerifyWebhookParams } from './api.schemas';
import { customFetch } from '../custom-fetch';
import type { ErrorType, BodyType } from '../custom-fetch';
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
export declare const getHealthCheckUrl: () => string;
/**
 * @summary Health check
 */
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListBusinessesUrl: () => string;
/**
 * @summary List all businesses
 */
export declare const listBusinesses: (options?: RequestInit) => Promise<Business[]>;
export declare const getListBusinessesQueryKey: () => readonly ["/api/businesses"];
export declare const getListBusinessesQueryOptions: <TData = Awaited<ReturnType<typeof listBusinesses>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBusinesses>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listBusinesses>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListBusinessesQueryResult = NonNullable<Awaited<ReturnType<typeof listBusinesses>>>;
export type ListBusinessesQueryError = ErrorType<unknown>;
/**
 * @summary List all businesses
 */
export declare function useListBusinesses<TData = Awaited<ReturnType<typeof listBusinesses>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBusinesses>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateBusinessUrl: () => string;
/**
 * @summary Create a business
 */
export declare const createBusiness: (createBusinessBody: CreateBusinessBody, options?: RequestInit) => Promise<Business>;
export declare const getCreateBusinessMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createBusiness>>, TError, {
        data: BodyType<CreateBusinessBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createBusiness>>, TError, {
    data: BodyType<CreateBusinessBody>;
}, TContext>;
export type CreateBusinessMutationResult = NonNullable<Awaited<ReturnType<typeof createBusiness>>>;
export type CreateBusinessMutationBody = BodyType<CreateBusinessBody>;
export type CreateBusinessMutationError = ErrorType<unknown>;
/**
* @summary Create a business
*/
export declare const useCreateBusiness: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createBusiness>>, TError, {
        data: BodyType<CreateBusinessBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createBusiness>>, TError, {
    data: BodyType<CreateBusinessBody>;
}, TContext>;
export declare const getGetBusinessUrl: (id: number) => string;
/**
 * @summary Get a business by ID
 */
export declare const getBusiness: (id: number, options?: RequestInit) => Promise<Business>;
export declare const getGetBusinessQueryKey: (id: number) => readonly [`/api/businesses/${number}`];
export declare const getGetBusinessQueryOptions: <TData = Awaited<ReturnType<typeof getBusiness>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBusiness>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getBusiness>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetBusinessQueryResult = NonNullable<Awaited<ReturnType<typeof getBusiness>>>;
export type GetBusinessQueryError = ErrorType<void>;
/**
 * @summary Get a business by ID
 */
export declare function useGetBusiness<TData = Awaited<ReturnType<typeof getBusiness>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBusiness>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateBusinessUrl: (id: number) => string;
/**
 * @summary Update a business
 */
export declare const updateBusiness: (id: number, updateBusinessBody: UpdateBusinessBody, options?: RequestInit) => Promise<Business>;
export declare const getUpdateBusinessMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateBusiness>>, TError, {
        id: number;
        data: BodyType<UpdateBusinessBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateBusiness>>, TError, {
    id: number;
    data: BodyType<UpdateBusinessBody>;
}, TContext>;
export type UpdateBusinessMutationResult = NonNullable<Awaited<ReturnType<typeof updateBusiness>>>;
export type UpdateBusinessMutationBody = BodyType<UpdateBusinessBody>;
export type UpdateBusinessMutationError = ErrorType<void>;
/**
* @summary Update a business
*/
export declare const useUpdateBusiness: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateBusiness>>, TError, {
        id: number;
        data: BodyType<UpdateBusinessBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateBusiness>>, TError, {
    id: number;
    data: BodyType<UpdateBusinessBody>;
}, TContext>;
export declare const getDeleteBusinessUrl: (id: number) => string;
/**
 * @summary Delete a business
 */
export declare const deleteBusiness: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteBusinessMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteBusiness>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteBusiness>>, TError, {
    id: number;
}, TContext>;
export type DeleteBusinessMutationResult = NonNullable<Awaited<ReturnType<typeof deleteBusiness>>>;
export type DeleteBusinessMutationError = ErrorType<unknown>;
/**
* @summary Delete a business
*/
export declare const useDeleteBusiness: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteBusiness>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteBusiness>>, TError, {
    id: number;
}, TContext>;
export declare const getListCustomersUrl: (params?: ListCustomersParams) => string;
/**
 * @summary List all customers
 */
export declare const listCustomers: (params?: ListCustomersParams, options?: RequestInit) => Promise<CustomerListResponse>;
export declare const getListCustomersQueryKey: (params?: ListCustomersParams) => readonly ["/api/customers", ...ListCustomersParams[]];
export declare const getListCustomersQueryOptions: <TData = Awaited<ReturnType<typeof listCustomers>>, TError = ErrorType<unknown>>(params?: ListCustomersParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listCustomers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listCustomers>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListCustomersQueryResult = NonNullable<Awaited<ReturnType<typeof listCustomers>>>;
export type ListCustomersQueryError = ErrorType<unknown>;
/**
 * @summary List all customers
 */
export declare function useListCustomers<TData = Awaited<ReturnType<typeof listCustomers>>, TError = ErrorType<unknown>>(params?: ListCustomersParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listCustomers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetCustomerStatsUrl: (params?: GetCustomerStatsParams) => string;
/**
 * @summary Get customer statistics
 */
export declare const getCustomerStats: (params?: GetCustomerStatsParams, options?: RequestInit) => Promise<CustomerStats>;
export declare const getGetCustomerStatsQueryKey: (params?: GetCustomerStatsParams) => readonly ["/api/customers/stats", ...GetCustomerStatsParams[]];
export declare const getGetCustomerStatsQueryOptions: <TData = Awaited<ReturnType<typeof getCustomerStats>>, TError = ErrorType<unknown>>(params?: GetCustomerStatsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCustomerStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getCustomerStats>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetCustomerStatsQueryResult = NonNullable<Awaited<ReturnType<typeof getCustomerStats>>>;
export type GetCustomerStatsQueryError = ErrorType<unknown>;
/**
 * @summary Get customer statistics
 */
export declare function useGetCustomerStats<TData = Awaited<ReturnType<typeof getCustomerStats>>, TError = ErrorType<unknown>>(params?: GetCustomerStatsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCustomerStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetCustomerUrl: (id: number, params?: GetCustomerParams) => string;
/**
 * @summary Get customer with message history
 */
export declare const getCustomer: (id: number, params?: GetCustomerParams, options?: RequestInit) => Promise<CustomerDetail>;
export declare const getGetCustomerQueryKey: (id: number, params?: GetCustomerParams) => readonly [`/api/customers/${number}`, ...GetCustomerParams[]];
export declare const getGetCustomerQueryOptions: <TData = Awaited<ReturnType<typeof getCustomer>>, TError = ErrorType<void>>(id: number, params?: GetCustomerParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCustomer>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getCustomer>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetCustomerQueryResult = NonNullable<Awaited<ReturnType<typeof getCustomer>>>;
export type GetCustomerQueryError = ErrorType<void>;
/**
 * @summary Get customer with message history
 */
export declare function useGetCustomer<TData = Awaited<ReturnType<typeof getCustomer>>, TError = ErrorType<void>>(id: number, params?: GetCustomerParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCustomer>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getPatchCustomerTagsUrl: (id: number, params?: PatchCustomerTagsParams) => string;
/**
 * @summary Set tags for a customer
 */
export declare const patchCustomerTags: (id: number, patchCustomerTagsBody: PatchCustomerTagsBody, params?: PatchCustomerTagsParams, options?: RequestInit) => Promise<CustomerDetail>;
export declare const getPatchCustomerTagsMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof patchCustomerTags>>, TError, {
        id: number;
        data: BodyType<PatchCustomerTagsBody>;
        params?: PatchCustomerTagsParams;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof patchCustomerTags>>, TError, {
    id: number;
    data: BodyType<PatchCustomerTagsBody>;
    params?: PatchCustomerTagsParams;
}, TContext>;
export type PatchCustomerTagsMutationResult = NonNullable<Awaited<ReturnType<typeof patchCustomerTags>>>;
export type PatchCustomerTagsMutationBody = BodyType<PatchCustomerTagsBody>;
export type PatchCustomerTagsMutationError = ErrorType<void>;
/**
* @summary Set tags for a customer
*/
export declare const usePatchCustomerTags: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof patchCustomerTags>>, TError, {
        id: number;
        data: BodyType<PatchCustomerTagsBody>;
        params?: PatchCustomerTagsParams;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof patchCustomerTags>>, TError, {
    id: number;
    data: BodyType<PatchCustomerTagsBody>;
    params?: PatchCustomerTagsParams;
}, TContext>;
export declare const getSendQuickReplyUrl: (id: number, params?: SendQuickReplyParams) => string;
/**
 * @summary Send a manual reply to a single customer
 */
export declare const sendQuickReply: (id: number, quickReplyBody: QuickReplyBody, params?: SendQuickReplyParams, options?: RequestInit) => Promise<QuickReplyResult>;
export declare const getSendQuickReplyMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendQuickReply>>, TError, {
        id: number;
        data: BodyType<QuickReplyBody>;
        params?: SendQuickReplyParams;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof sendQuickReply>>, TError, {
    id: number;
    data: BodyType<QuickReplyBody>;
    params?: SendQuickReplyParams;
}, TContext>;
export type SendQuickReplyMutationResult = NonNullable<Awaited<ReturnType<typeof sendQuickReply>>>;
export type SendQuickReplyMutationBody = BodyType<QuickReplyBody>;
export type SendQuickReplyMutationError = ErrorType<void>;
/**
* @summary Send a manual reply to a single customer
*/
export declare const useSendQuickReply: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendQuickReply>>, TError, {
        id: number;
        data: BodyType<QuickReplyBody>;
        params?: SendQuickReplyParams;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof sendQuickReply>>, TError, {
    id: number;
    data: BodyType<QuickReplyBody>;
    params?: SendQuickReplyParams;
}, TContext>;
export declare const getBroadcastToCustomersUrl: (params?: BroadcastToCustomersParams) => string;
/**
 * @summary Send a personalised WhatsApp message to selected customers
 */
export declare const broadcastToCustomers: (broadcastBody: BroadcastBody, params?: BroadcastToCustomersParams, options?: RequestInit) => Promise<BroadcastResult>;
export declare const getBroadcastToCustomersMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof broadcastToCustomers>>, TError, {
        data: BodyType<BroadcastBody>;
        params?: BroadcastToCustomersParams;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof broadcastToCustomers>>, TError, {
    data: BodyType<BroadcastBody>;
    params?: BroadcastToCustomersParams;
}, TContext>;
export type BroadcastToCustomersMutationResult = NonNullable<Awaited<ReturnType<typeof broadcastToCustomers>>>;
export type BroadcastToCustomersMutationBody = BodyType<BroadcastBody>;
export type BroadcastToCustomersMutationError = ErrorType<void>;
/**
* @summary Send a personalised WhatsApp message to selected customers
*/
export declare const useBroadcastToCustomers: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof broadcastToCustomers>>, TError, {
        data: BodyType<BroadcastBody>;
        params?: BroadcastToCustomersParams;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof broadcastToCustomers>>, TError, {
    data: BodyType<BroadcastBody>;
    params?: BroadcastToCustomersParams;
}, TContext>;
export declare const getListMessagesUrl: (params?: ListMessagesParams) => string;
/**
 * @summary List all messages
 */
export declare const listMessages: (params?: ListMessagesParams, options?: RequestInit) => Promise<MessageListResponse>;
export declare const getListMessagesQueryKey: (params?: ListMessagesParams) => readonly ["/api/messages", ...ListMessagesParams[]];
export declare const getListMessagesQueryOptions: <TData = Awaited<ReturnType<typeof listMessages>>, TError = ErrorType<unknown>>(params?: ListMessagesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listMessages>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listMessages>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListMessagesQueryResult = NonNullable<Awaited<ReturnType<typeof listMessages>>>;
export type ListMessagesQueryError = ErrorType<unknown>;
/**
 * @summary List all messages
 */
export declare function useListMessages<TData = Awaited<ReturnType<typeof listMessages>>, TError = ErrorType<unknown>>(params?: ListMessagesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listMessages>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListFaqsUrl: (params?: ListFaqsParams) => string;
/**
 * @summary List all FAQs
 */
export declare const listFaqs: (params?: ListFaqsParams, options?: RequestInit) => Promise<Faq[]>;
export declare const getListFaqsQueryKey: (params?: ListFaqsParams) => readonly ["/api/faqs", ...ListFaqsParams[]];
export declare const getListFaqsQueryOptions: <TData = Awaited<ReturnType<typeof listFaqs>>, TError = ErrorType<unknown>>(params?: ListFaqsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listFaqs>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listFaqs>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListFaqsQueryResult = NonNullable<Awaited<ReturnType<typeof listFaqs>>>;
export type ListFaqsQueryError = ErrorType<unknown>;
/**
 * @summary List all FAQs
 */
export declare function useListFaqs<TData = Awaited<ReturnType<typeof listFaqs>>, TError = ErrorType<unknown>>(params?: ListFaqsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listFaqs>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateFaqUrl: (params?: CreateFaqParams) => string;
/**
 * @summary Create a new FAQ
 */
export declare const createFaq: (createFaqBody: CreateFaqBody, params?: CreateFaqParams, options?: RequestInit) => Promise<Faq>;
export declare const getCreateFaqMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createFaq>>, TError, {
        data: BodyType<CreateFaqBody>;
        params?: CreateFaqParams;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createFaq>>, TError, {
    data: BodyType<CreateFaqBody>;
    params?: CreateFaqParams;
}, TContext>;
export type CreateFaqMutationResult = NonNullable<Awaited<ReturnType<typeof createFaq>>>;
export type CreateFaqMutationBody = BodyType<CreateFaqBody>;
export type CreateFaqMutationError = ErrorType<unknown>;
/**
* @summary Create a new FAQ
*/
export declare const useCreateFaq: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createFaq>>, TError, {
        data: BodyType<CreateFaqBody>;
        params?: CreateFaqParams;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createFaq>>, TError, {
    data: BodyType<CreateFaqBody>;
    params?: CreateFaqParams;
}, TContext>;
export declare const getUpdateFaqUrl: (id: number, params?: UpdateFaqParams) => string;
/**
 * @summary Update a FAQ
 */
export declare const updateFaq: (id: number, updateFaqBody: UpdateFaqBody, params?: UpdateFaqParams, options?: RequestInit) => Promise<Faq>;
export declare const getUpdateFaqMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateFaq>>, TError, {
        id: number;
        data: BodyType<UpdateFaqBody>;
        params?: UpdateFaqParams;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateFaq>>, TError, {
    id: number;
    data: BodyType<UpdateFaqBody>;
    params?: UpdateFaqParams;
}, TContext>;
export type UpdateFaqMutationResult = NonNullable<Awaited<ReturnType<typeof updateFaq>>>;
export type UpdateFaqMutationBody = BodyType<UpdateFaqBody>;
export type UpdateFaqMutationError = ErrorType<void>;
/**
* @summary Update a FAQ
*/
export declare const useUpdateFaq: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateFaq>>, TError, {
        id: number;
        data: BodyType<UpdateFaqBody>;
        params?: UpdateFaqParams;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateFaq>>, TError, {
    id: number;
    data: BodyType<UpdateFaqBody>;
    params?: UpdateFaqParams;
}, TContext>;
export declare const getDeleteFaqUrl: (id: number, params?: DeleteFaqParams) => string;
/**
 * @summary Delete a FAQ
 */
export declare const deleteFaq: (id: number, params?: DeleteFaqParams, options?: RequestInit) => Promise<void>;
export declare const getDeleteFaqMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteFaq>>, TError, {
        id: number;
        params?: DeleteFaqParams;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteFaq>>, TError, {
    id: number;
    params?: DeleteFaqParams;
}, TContext>;
export type DeleteFaqMutationResult = NonNullable<Awaited<ReturnType<typeof deleteFaq>>>;
export type DeleteFaqMutationError = ErrorType<unknown>;
/**
* @summary Delete a FAQ
*/
export declare const useDeleteFaq: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteFaq>>, TError, {
        id: number;
        params?: DeleteFaqParams;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteFaq>>, TError, {
    id: number;
    params?: DeleteFaqParams;
}, TContext>;
export declare const getListCannedResponsesUrl: (params?: ListCannedResponsesParams) => string;
/**
 * @summary List all canned responses
 */
export declare const listCannedResponses: (params?: ListCannedResponsesParams, options?: RequestInit) => Promise<CannedResponse[]>;
export declare const getListCannedResponsesQueryKey: (params?: ListCannedResponsesParams) => readonly ["/api/canned-responses", ...ListCannedResponsesParams[]];
export declare const getListCannedResponsesQueryOptions: <TData = Awaited<ReturnType<typeof listCannedResponses>>, TError = ErrorType<unknown>>(params?: ListCannedResponsesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listCannedResponses>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listCannedResponses>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListCannedResponsesQueryResult = NonNullable<Awaited<ReturnType<typeof listCannedResponses>>>;
export type ListCannedResponsesQueryError = ErrorType<unknown>;
/**
 * @summary List all canned responses
 */
export declare function useListCannedResponses<TData = Awaited<ReturnType<typeof listCannedResponses>>, TError = ErrorType<unknown>>(params?: ListCannedResponsesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listCannedResponses>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateCannedResponseUrl: (params?: CreateCannedResponseParams) => string;
/**
 * @summary Create a canned response
 */
export declare const createCannedResponse: (cannedResponseBody: CannedResponseBody, params?: CreateCannedResponseParams, options?: RequestInit) => Promise<CannedResponse>;
export declare const getCreateCannedResponseMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createCannedResponse>>, TError, {
        data: BodyType<CannedResponseBody>;
        params?: CreateCannedResponseParams;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createCannedResponse>>, TError, {
    data: BodyType<CannedResponseBody>;
    params?: CreateCannedResponseParams;
}, TContext>;
export type CreateCannedResponseMutationResult = NonNullable<Awaited<ReturnType<typeof createCannedResponse>>>;
export type CreateCannedResponseMutationBody = BodyType<CannedResponseBody>;
export type CreateCannedResponseMutationError = ErrorType<void>;
/**
* @summary Create a canned response
*/
export declare const useCreateCannedResponse: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createCannedResponse>>, TError, {
        data: BodyType<CannedResponseBody>;
        params?: CreateCannedResponseParams;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createCannedResponse>>, TError, {
    data: BodyType<CannedResponseBody>;
    params?: CreateCannedResponseParams;
}, TContext>;
export declare const getUpdateCannedResponseUrl: (id: number, params?: UpdateCannedResponseParams) => string;
/**
 * @summary Update a canned response
 */
export declare const updateCannedResponse: (id: number, cannedResponseBody: CannedResponseBody, params?: UpdateCannedResponseParams, options?: RequestInit) => Promise<CannedResponse>;
export declare const getUpdateCannedResponseMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateCannedResponse>>, TError, {
        id: number;
        data: BodyType<CannedResponseBody>;
        params?: UpdateCannedResponseParams;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateCannedResponse>>, TError, {
    id: number;
    data: BodyType<CannedResponseBody>;
    params?: UpdateCannedResponseParams;
}, TContext>;
export type UpdateCannedResponseMutationResult = NonNullable<Awaited<ReturnType<typeof updateCannedResponse>>>;
export type UpdateCannedResponseMutationBody = BodyType<CannedResponseBody>;
export type UpdateCannedResponseMutationError = ErrorType<void>;
/**
* @summary Update a canned response
*/
export declare const useUpdateCannedResponse: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateCannedResponse>>, TError, {
        id: number;
        data: BodyType<CannedResponseBody>;
        params?: UpdateCannedResponseParams;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateCannedResponse>>, TError, {
    id: number;
    data: BodyType<CannedResponseBody>;
    params?: UpdateCannedResponseParams;
}, TContext>;
export declare const getDeleteCannedResponseUrl: (id: number, params?: DeleteCannedResponseParams) => string;
/**
 * @summary Delete a canned response
 */
export declare const deleteCannedResponse: (id: number, params?: DeleteCannedResponseParams, options?: RequestInit) => Promise<void>;
export declare const getDeleteCannedResponseMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteCannedResponse>>, TError, {
        id: number;
        params?: DeleteCannedResponseParams;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteCannedResponse>>, TError, {
    id: number;
    params?: DeleteCannedResponseParams;
}, TContext>;
export type DeleteCannedResponseMutationResult = NonNullable<Awaited<ReturnType<typeof deleteCannedResponse>>>;
export type DeleteCannedResponseMutationError = ErrorType<unknown>;
/**
* @summary Delete a canned response
*/
export declare const useDeleteCannedResponse: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteCannedResponse>>, TError, {
        id: number;
        params?: DeleteCannedResponseParams;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteCannedResponse>>, TError, {
    id: number;
    params?: DeleteCannedResponseParams;
}, TContext>;
export declare const getListServicesUrl: (params?: ListServicesParams) => string;
/**
 * @summary List all services
 */
export declare const listServices: (params?: ListServicesParams, options?: RequestInit) => Promise<Service[]>;
export declare const getListServicesQueryKey: (params?: ListServicesParams) => readonly ["/api/services", ...ListServicesParams[]];
export declare const getListServicesQueryOptions: <TData = Awaited<ReturnType<typeof listServices>>, TError = ErrorType<unknown>>(params?: ListServicesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listServices>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listServices>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListServicesQueryResult = NonNullable<Awaited<ReturnType<typeof listServices>>>;
export type ListServicesQueryError = ErrorType<unknown>;
/**
 * @summary List all services
 */
export declare function useListServices<TData = Awaited<ReturnType<typeof listServices>>, TError = ErrorType<unknown>>(params?: ListServicesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listServices>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateServiceUrl: (params?: CreateServiceParams) => string;
/**
 * @summary Create a service
 */
export declare const createService: (createServiceBody: CreateServiceBody, params?: CreateServiceParams, options?: RequestInit) => Promise<Service>;
export declare const getCreateServiceMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createService>>, TError, {
        data: BodyType<CreateServiceBody>;
        params?: CreateServiceParams;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createService>>, TError, {
    data: BodyType<CreateServiceBody>;
    params?: CreateServiceParams;
}, TContext>;
export type CreateServiceMutationResult = NonNullable<Awaited<ReturnType<typeof createService>>>;
export type CreateServiceMutationBody = BodyType<CreateServiceBody>;
export type CreateServiceMutationError = ErrorType<unknown>;
/**
* @summary Create a service
*/
export declare const useCreateService: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createService>>, TError, {
        data: BodyType<CreateServiceBody>;
        params?: CreateServiceParams;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createService>>, TError, {
    data: BodyType<CreateServiceBody>;
    params?: CreateServiceParams;
}, TContext>;
export declare const getUpdateServiceUrl: (id: number, params?: UpdateServiceParams) => string;
/**
 * @summary Update a service
 */
export declare const updateService: (id: number, updateServiceBody: UpdateServiceBody, params?: UpdateServiceParams, options?: RequestInit) => Promise<Service>;
export declare const getUpdateServiceMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateService>>, TError, {
        id: number;
        data: BodyType<UpdateServiceBody>;
        params?: UpdateServiceParams;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateService>>, TError, {
    id: number;
    data: BodyType<UpdateServiceBody>;
    params?: UpdateServiceParams;
}, TContext>;
export type UpdateServiceMutationResult = NonNullable<Awaited<ReturnType<typeof updateService>>>;
export type UpdateServiceMutationBody = BodyType<UpdateServiceBody>;
export type UpdateServiceMutationError = ErrorType<void>;
/**
* @summary Update a service
*/
export declare const useUpdateService: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateService>>, TError, {
        id: number;
        data: BodyType<UpdateServiceBody>;
        params?: UpdateServiceParams;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateService>>, TError, {
    id: number;
    data: BodyType<UpdateServiceBody>;
    params?: UpdateServiceParams;
}, TContext>;
export declare const getDeleteServiceUrl: (id: number, params?: DeleteServiceParams) => string;
/**
 * @summary Delete a service
 */
export declare const deleteService: (id: number, params?: DeleteServiceParams, options?: RequestInit) => Promise<void>;
export declare const getDeleteServiceMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteService>>, TError, {
        id: number;
        params?: DeleteServiceParams;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteService>>, TError, {
    id: number;
    params?: DeleteServiceParams;
}, TContext>;
export type DeleteServiceMutationResult = NonNullable<Awaited<ReturnType<typeof deleteService>>>;
export type DeleteServiceMutationError = ErrorType<unknown>;
/**
* @summary Delete a service
*/
export declare const useDeleteService: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteService>>, TError, {
        id: number;
        params?: DeleteServiceParams;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteService>>, TError, {
    id: number;
    params?: DeleteServiceParams;
}, TContext>;
export declare const getListBookingsUrl: (params?: ListBookingsParams) => string;
/**
 * @summary List all bookings
 */
export declare const listBookings: (params?: ListBookingsParams, options?: RequestInit) => Promise<BookingListResponse>;
export declare const getListBookingsQueryKey: (params?: ListBookingsParams) => readonly ["/api/bookings", ...ListBookingsParams[]];
export declare const getListBookingsQueryOptions: <TData = Awaited<ReturnType<typeof listBookings>>, TError = ErrorType<unknown>>(params?: ListBookingsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBookings>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listBookings>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListBookingsQueryResult = NonNullable<Awaited<ReturnType<typeof listBookings>>>;
export type ListBookingsQueryError = ErrorType<unknown>;
/**
 * @summary List all bookings
 */
export declare function useListBookings<TData = Awaited<ReturnType<typeof listBookings>>, TError = ErrorType<unknown>>(params?: ListBookingsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBookings>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateBookingUrl: (params?: CreateBookingParams) => string;
/**
 * @summary Create a booking
 */
export declare const createBooking: (createBookingBody: CreateBookingBody, params?: CreateBookingParams, options?: RequestInit) => Promise<Booking>;
export declare const getCreateBookingMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createBooking>>, TError, {
        data: BodyType<CreateBookingBody>;
        params?: CreateBookingParams;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createBooking>>, TError, {
    data: BodyType<CreateBookingBody>;
    params?: CreateBookingParams;
}, TContext>;
export type CreateBookingMutationResult = NonNullable<Awaited<ReturnType<typeof createBooking>>>;
export type CreateBookingMutationBody = BodyType<CreateBookingBody>;
export type CreateBookingMutationError = ErrorType<unknown>;
/**
* @summary Create a booking
*/
export declare const useCreateBooking: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createBooking>>, TError, {
        data: BodyType<CreateBookingBody>;
        params?: CreateBookingParams;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createBooking>>, TError, {
    data: BodyType<CreateBookingBody>;
    params?: CreateBookingParams;
}, TContext>;
export declare const getUpdateBookingUrl: (id: number, params?: UpdateBookingParams) => string;
/**
 * @summary Approve, reject, or complete a booking
 */
export declare const updateBooking: (id: number, updateBookingBody: UpdateBookingBody, params?: UpdateBookingParams, options?: RequestInit) => Promise<Booking>;
export declare const getUpdateBookingMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateBooking>>, TError, {
        id: number;
        data: BodyType<UpdateBookingBody>;
        params?: UpdateBookingParams;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateBooking>>, TError, {
    id: number;
    data: BodyType<UpdateBookingBody>;
    params?: UpdateBookingParams;
}, TContext>;
export type UpdateBookingMutationResult = NonNullable<Awaited<ReturnType<typeof updateBooking>>>;
export type UpdateBookingMutationBody = BodyType<UpdateBookingBody>;
export type UpdateBookingMutationError = ErrorType<void>;
/**
* @summary Approve, reject, or complete a booking
*/
export declare const useUpdateBooking: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateBooking>>, TError, {
        id: number;
        data: BodyType<UpdateBookingBody>;
        params?: UpdateBookingParams;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateBooking>>, TError, {
    id: number;
    data: BodyType<UpdateBookingBody>;
    params?: UpdateBookingParams;
}, TContext>;
export declare const getDeleteBookingUrl: (id: number, params?: DeleteBookingParams) => string;
/**
 * @summary Delete a booking
 */
export declare const deleteBooking: (id: number, params?: DeleteBookingParams, options?: RequestInit) => Promise<void>;
export declare const getDeleteBookingMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteBooking>>, TError, {
        id: number;
        params?: DeleteBookingParams;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteBooking>>, TError, {
    id: number;
    params?: DeleteBookingParams;
}, TContext>;
export type DeleteBookingMutationResult = NonNullable<Awaited<ReturnType<typeof deleteBooking>>>;
export type DeleteBookingMutationError = ErrorType<unknown>;
/**
* @summary Delete a booking
*/
export declare const useDeleteBooking: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteBooking>>, TError, {
        id: number;
        params?: DeleteBookingParams;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteBooking>>, TError, {
    id: number;
    params?: DeleteBookingParams;
}, TContext>;
export declare const getVerifyWebhookUrl: (params?: VerifyWebhookParams) => string;
/**
 * @summary WhatsApp webhook verification
 */
export declare const verifyWebhook: (params?: VerifyWebhookParams, options?: RequestInit) => Promise<void>;
export declare const getVerifyWebhookQueryKey: (params?: VerifyWebhookParams) => readonly ["/api/webhook", ...VerifyWebhookParams[]];
export declare const getVerifyWebhookQueryOptions: <TData = Awaited<ReturnType<typeof verifyWebhook>>, TError = ErrorType<void>>(params?: VerifyWebhookParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof verifyWebhook>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof verifyWebhook>>, TError, TData> & {
    queryKey: QueryKey;
};
export type VerifyWebhookQueryResult = NonNullable<Awaited<ReturnType<typeof verifyWebhook>>>;
export type VerifyWebhookQueryError = ErrorType<void>;
/**
 * @summary WhatsApp webhook verification
 */
export declare function useVerifyWebhook<TData = Awaited<ReturnType<typeof verifyWebhook>>, TError = ErrorType<void>>(params?: VerifyWebhookParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof verifyWebhook>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getReceiveWebhookUrl: () => string;
/**
 * @summary Receive WhatsApp messages
 */
export declare const receiveWebhook: (receiveWebhookBody: ReceiveWebhookBody, options?: RequestInit) => Promise<void>;
export declare const getReceiveWebhookMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof receiveWebhook>>, TError, {
        data: BodyType<ReceiveWebhookBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof receiveWebhook>>, TError, {
    data: BodyType<ReceiveWebhookBody>;
}, TContext>;
export type ReceiveWebhookMutationResult = NonNullable<Awaited<ReturnType<typeof receiveWebhook>>>;
export type ReceiveWebhookMutationBody = BodyType<ReceiveWebhookBody>;
export type ReceiveWebhookMutationError = ErrorType<unknown>;
/**
* @summary Receive WhatsApp messages
*/
export declare const useReceiveWebhook: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof receiveWebhook>>, TError, {
        data: BodyType<ReceiveWebhookBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof receiveWebhook>>, TError, {
    data: BodyType<ReceiveWebhookBody>;
}, TContext>;
export declare const getGetDashboardStatsUrl: (params?: GetDashboardStatsParams) => string;
/**
 * @summary Get overall dashboard statistics
 */
export declare const getDashboardStats: (params?: GetDashboardStatsParams, options?: RequestInit) => Promise<DashboardStats>;
export declare const getGetDashboardStatsQueryKey: (params?: GetDashboardStatsParams) => readonly ["/api/dashboard/stats", ...GetDashboardStatsParams[]];
export declare const getGetDashboardStatsQueryOptions: <TData = Awaited<ReturnType<typeof getDashboardStats>>, TError = ErrorType<unknown>>(params?: GetDashboardStatsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getDashboardStats>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetDashboardStatsQueryResult = NonNullable<Awaited<ReturnType<typeof getDashboardStats>>>;
export type GetDashboardStatsQueryError = ErrorType<unknown>;
/**
 * @summary Get overall dashboard statistics
 */
export declare function useGetDashboardStats<TData = Awaited<ReturnType<typeof getDashboardStats>>, TError = ErrorType<unknown>>(params?: GetDashboardStatsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetSettingsUrl: (params?: GetSettingsParams) => string;
/**
 * @summary Get business settings
 */
export declare const getSettings: (params?: GetSettingsParams, options?: RequestInit) => Promise<BusinessSettings>;
export declare const getGetSettingsQueryKey: (params?: GetSettingsParams) => readonly ["/api/settings", ...GetSettingsParams[]];
export declare const getGetSettingsQueryOptions: <TData = Awaited<ReturnType<typeof getSettings>>, TError = ErrorType<unknown>>(params?: GetSettingsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSettings>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getSettings>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetSettingsQueryResult = NonNullable<Awaited<ReturnType<typeof getSettings>>>;
export type GetSettingsQueryError = ErrorType<unknown>;
/**
 * @summary Get business settings
 */
export declare function useGetSettings<TData = Awaited<ReturnType<typeof getSettings>>, TError = ErrorType<unknown>>(params?: GetSettingsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSettings>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateSettingsUrl: (params?: UpdateSettingsParams) => string;
/**
 * @summary Update business settings
 */
export declare const updateSettings: (updateSettingsBody: UpdateSettingsBody, params?: UpdateSettingsParams, options?: RequestInit) => Promise<BusinessSettings>;
export declare const getUpdateSettingsMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateSettings>>, TError, {
        data: BodyType<UpdateSettingsBody>;
        params?: UpdateSettingsParams;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateSettings>>, TError, {
    data: BodyType<UpdateSettingsBody>;
    params?: UpdateSettingsParams;
}, TContext>;
export type UpdateSettingsMutationResult = NonNullable<Awaited<ReturnType<typeof updateSettings>>>;
export type UpdateSettingsMutationBody = BodyType<UpdateSettingsBody>;
export type UpdateSettingsMutationError = ErrorType<unknown>;
/**
* @summary Update business settings
*/
export declare const useUpdateSettings: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateSettings>>, TError, {
        data: BodyType<UpdateSettingsBody>;
        params?: UpdateSettingsParams;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateSettings>>, TError, {
    data: BodyType<UpdateSettingsBody>;
    params?: UpdateSettingsParams;
}, TContext>;
export declare const getSimulateMessageUrl: (params?: SimulateMessageParams) => string;
/**
 * @summary Simulate bot response without sending to WhatsApp
 */
export declare const simulateMessage: (simulateMessageBody: SimulateMessageBody, params?: SimulateMessageParams, options?: RequestInit) => Promise<SimulateMessageResponse>;
export declare const getSimulateMessageMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof simulateMessage>>, TError, {
        data: BodyType<SimulateMessageBody>;
        params?: SimulateMessageParams;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof simulateMessage>>, TError, {
    data: BodyType<SimulateMessageBody>;
    params?: SimulateMessageParams;
}, TContext>;
export type SimulateMessageMutationResult = NonNullable<Awaited<ReturnType<typeof simulateMessage>>>;
export type SimulateMessageMutationBody = BodyType<SimulateMessageBody>;
export type SimulateMessageMutationError = ErrorType<unknown>;
/**
* @summary Simulate bot response without sending to WhatsApp
*/
export declare const useSimulateMessage: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof simulateMessage>>, TError, {
        data: BodyType<SimulateMessageBody>;
        params?: SimulateMessageParams;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof simulateMessage>>, TError, {
    data: BodyType<SimulateMessageBody>;
    params?: SimulateMessageParams;
}, TContext>;
export declare const getListAiUsageUrl: (params?: ListAiUsageParams) => string;
/**
 * @summary List AI usage logs
 */
export declare const listAiUsage: (params?: ListAiUsageParams, options?: RequestInit) => Promise<AiUsageListResponse>;
export declare const getListAiUsageQueryKey: (params?: ListAiUsageParams) => readonly ["/api/ai-usage", ...ListAiUsageParams[]];
export declare const getListAiUsageQueryOptions: <TData = Awaited<ReturnType<typeof listAiUsage>>, TError = ErrorType<unknown>>(params?: ListAiUsageParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAiUsage>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listAiUsage>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListAiUsageQueryResult = NonNullable<Awaited<ReturnType<typeof listAiUsage>>>;
export type ListAiUsageQueryError = ErrorType<unknown>;
/**
 * @summary List AI usage logs
 */
export declare function useListAiUsage<TData = Awaited<ReturnType<typeof listAiUsage>>, TError = ErrorType<unknown>>(params?: ListAiUsageParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAiUsage>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export {};
//# sourceMappingURL=api.d.ts.map