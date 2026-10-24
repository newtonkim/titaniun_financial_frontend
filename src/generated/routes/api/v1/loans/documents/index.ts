import { queryParams, type RouteQueryOptions, type RouteDefinition, applyUrlDefaults } from './../../../../../wayfinder'
/**
* @see \Modules\Loans\Http\Controllers\V1\LoanWorkflowController::store
* @see Modules/Loans/app/Http/Controllers/V1/LoanWorkflowController.php:50
* @route '/api/v1/loans/{loan}/documents'
*/
export const store = (args: { loan: number | { id: number } } | [loan: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(args, options),
    method: 'post',
})

store.definition = {
    methods: ["post"],
    url: '/api/v1/loans/{loan}/documents',
} satisfies RouteDefinition<["post"]>

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanWorkflowController::store
* @see Modules/Loans/app/Http/Controllers/V1/LoanWorkflowController.php:50
* @route '/api/v1/loans/{loan}/documents'
*/
store.url = (args: { loan: number | { id: number } } | [loan: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { loan: args }
    }

    if (typeof args === 'object' && !Array.isArray(args) && 'id' in args) {
        args = { loan: args.id }
    }

    if (Array.isArray(args)) {
        args = {
            loan: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        loan: typeof args.loan === 'object'
        ? args.loan.id
        : args.loan,
    }

    return store.definition.url
            .replace('{loan}', parsedArgs.loan.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanWorkflowController::store
* @see Modules/Loans/app/Http/Controllers/V1/LoanWorkflowController.php:50
* @route '/api/v1/loans/{loan}/documents'
*/
store.post = (args: { loan: number | { id: number } } | [loan: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(args, options),
    method: 'post',
})

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanWorkflowController::download
* @see Modules/Loans/app/Http/Controllers/V1/LoanWorkflowController.php:81
* @route '/api/v1/loans/{loan}/documents/{document}'
*/
export const download = (args: { loan: number | { id: number }, document: string | number } | [loan: number | { id: number }, document: string | number ], options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: download.url(args, options),
    method: 'get',
})

download.definition = {
    methods: ["get","head"],
    url: '/api/v1/loans/{loan}/documents/{document}',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanWorkflowController::download
* @see Modules/Loans/app/Http/Controllers/V1/LoanWorkflowController.php:81
* @route '/api/v1/loans/{loan}/documents/{document}'
*/
download.url = (args: { loan: number | { id: number }, document: string | number } | [loan: number | { id: number }, document: string | number ], options?: RouteQueryOptions) => {
    if (Array.isArray(args)) {
        args = {
            loan: args[0],
            document: args[1],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        loan: typeof args.loan === 'object'
        ? args.loan.id
        : args.loan,
        document: args.document,
    }

    return download.definition.url
            .replace('{loan}', parsedArgs.loan.toString())
            .replace('{document}', parsedArgs.document.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanWorkflowController::download
* @see Modules/Loans/app/Http/Controllers/V1/LoanWorkflowController.php:81
* @route '/api/v1/loans/{loan}/documents/{document}'
*/
download.get = (args: { loan: number | { id: number }, document: string | number } | [loan: number | { id: number }, document: string | number ], options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: download.url(args, options),
    method: 'get',
})

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanWorkflowController::download
* @see Modules/Loans/app/Http/Controllers/V1/LoanWorkflowController.php:81
* @route '/api/v1/loans/{loan}/documents/{document}'
*/
download.head = (args: { loan: number | { id: number }, document: string | number } | [loan: number | { id: number }, document: string | number ], options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: download.url(args, options),
    method: 'head',
})

const documents = {
    store: Object.assign(store, store),
    download: Object.assign(download, download),
}

export default documents