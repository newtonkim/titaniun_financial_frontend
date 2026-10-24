import { queryParams, type RouteQueryOptions, type RouteDefinition, applyUrlDefaults } from './../../../../../wayfinder'
/**
* @see \Modules\Loans\Http\Controllers\V1\LoanRepaymentController::index
* @see Modules/Loans/app/Http/Controllers/V1/LoanRepaymentController.php:20
* @route '/api/v1/loans/{loan}/repayments'
*/
export const index = (args: { loan: number | { id: number } } | [loan: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(args, options),
    method: 'get',
})

index.definition = {
    methods: ["get","head"],
    url: '/api/v1/loans/{loan}/repayments',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanRepaymentController::index
* @see Modules/Loans/app/Http/Controllers/V1/LoanRepaymentController.php:20
* @route '/api/v1/loans/{loan}/repayments'
*/
index.url = (args: { loan: number | { id: number } } | [loan: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions) => {
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

    return index.definition.url
            .replace('{loan}', parsedArgs.loan.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanRepaymentController::index
* @see Modules/Loans/app/Http/Controllers/V1/LoanRepaymentController.php:20
* @route '/api/v1/loans/{loan}/repayments'
*/
index.get = (args: { loan: number | { id: number } } | [loan: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(args, options),
    method: 'get',
})

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanRepaymentController::index
* @see Modules/Loans/app/Http/Controllers/V1/LoanRepaymentController.php:20
* @route '/api/v1/loans/{loan}/repayments'
*/
index.head = (args: { loan: number | { id: number } } | [loan: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: index.url(args, options),
    method: 'head',
})

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanRepaymentController::store
* @see Modules/Loans/app/Http/Controllers/V1/LoanRepaymentController.php:25
* @route '/api/v1/loans/{loan}/repayments'
*/
export const store = (args: { loan: number | { id: number } } | [loan: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(args, options),
    method: 'post',
})

store.definition = {
    methods: ["post"],
    url: '/api/v1/loans/{loan}/repayments',
} satisfies RouteDefinition<["post"]>

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanRepaymentController::store
* @see Modules/Loans/app/Http/Controllers/V1/LoanRepaymentController.php:25
* @route '/api/v1/loans/{loan}/repayments'
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
* @see \Modules\Loans\Http\Controllers\V1\LoanRepaymentController::store
* @see Modules/Loans/app/Http/Controllers/V1/LoanRepaymentController.php:25
* @route '/api/v1/loans/{loan}/repayments'
*/
store.post = (args: { loan: number | { id: number } } | [loan: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(args, options),
    method: 'post',
})

const repayments = {
    index: Object.assign(index, index),
    store: Object.assign(store, store),
}

export default repayments