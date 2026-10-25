import { queryParams, type RouteQueryOptions, type RouteDefinition } from './../../../../wayfinder'
import staff from './staff'
import roles from './roles'
/**
* @see \App\Http\Controllers\Api\V1\AccessController::permissions
* @see app/Http/Controllers/Api/V1/AccessController.php:17
* @route '/api/v1/settings/permissions'
*/
export const permissions = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: permissions.url(options),
    method: 'get',
})

permissions.definition = {
    methods: ["get","head"],
    url: '/api/v1/settings/permissions',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\V1\AccessController::permissions
* @see app/Http/Controllers/Api/V1/AccessController.php:17
* @route '/api/v1/settings/permissions'
*/
permissions.url = (options?: RouteQueryOptions) => {
    return permissions.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\V1\AccessController::permissions
* @see app/Http/Controllers/Api/V1/AccessController.php:17
* @route '/api/v1/settings/permissions'
*/
permissions.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: permissions.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Api\V1\AccessController::permissions
* @see app/Http/Controllers/Api/V1/AccessController.php:17
* @route '/api/v1/settings/permissions'
*/
permissions.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: permissions.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Api\V1\AccessController::accessAudit
* @see app/Http/Controllers/Api/V1/AccessController.php:41
* @route '/api/v1/settings/access-audit'
*/
export const accessAudit = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: accessAudit.url(options),
    method: 'get',
})

accessAudit.definition = {
    methods: ["get","head"],
    url: '/api/v1/settings/access-audit',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Api\V1\AccessController::accessAudit
* @see app/Http/Controllers/Api/V1/AccessController.php:41
* @route '/api/v1/settings/access-audit'
*/
accessAudit.url = (options?: RouteQueryOptions) => {
    return accessAudit.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Api\V1\AccessController::accessAudit
* @see app/Http/Controllers/Api/V1/AccessController.php:41
* @route '/api/v1/settings/access-audit'
*/
accessAudit.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: accessAudit.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Api\V1\AccessController::accessAudit
* @see app/Http/Controllers/Api/V1/AccessController.php:41
* @route '/api/v1/settings/access-audit'
*/
accessAudit.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: accessAudit.url(options),
    method: 'head',
})

const settings = {
    permissions: Object.assign(permissions, permissions),
    staff: Object.assign(staff, staff),
    accessAudit: Object.assign(accessAudit, accessAudit),
    roles: Object.assign(roles, roles),
}

export default settings