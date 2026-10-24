import { queryParams, type RouteQueryOptions, type RouteDefinition, applyUrlDefaults } from './../../../../wayfinder'
/**
* @see \Modules\Loans\Http\Controllers\V1\LoanCommissionController::index
* @see Modules/Loans/app/Http/Controllers/V1/LoanCommissionController.php:18
* @route '/api/v1/loan-commissions'
*/
export const index = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

index.definition = {
    methods: ["get","head"],
    url: '/api/v1/loan-commissions',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanCommissionController::index
* @see Modules/Loans/app/Http/Controllers/V1/LoanCommissionController.php:18
* @route '/api/v1/loan-commissions'
*/
index.url = (options?: RouteQueryOptions) => {
    return index.definition.url + queryParams(options)
}

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanCommissionController::index
* @see Modules/Loans/app/Http/Controllers/V1/LoanCommissionController.php:18
* @route '/api/v1/loan-commissions'
*/
index.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanCommissionController::index
* @see Modules/Loans/app/Http/Controllers/V1/LoanCommissionController.php:18
* @route '/api/v1/loan-commissions'
*/
index.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: index.url(options),
    method: 'head',
})

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanCommissionController::pay
* @see Modules/Loans/app/Http/Controllers/V1/LoanCommissionController.php:31
* @route '/api/v1/loan-commissions/{commission}/payment'
*/
export const pay = (args: { commission: string | number | { id: string | number } } | [commission: string | number | { id: string | number } ] | string | number | { id: string | number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: pay.url(args, options),
    method: 'post',
})

pay.definition = {
    methods: ["post"],
    url: '/api/v1/loan-commissions/{commission}/payment',
} satisfies RouteDefinition<["post"]>

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanCommissionController::pay
* @see Modules/Loans/app/Http/Controllers/V1/LoanCommissionController.php:31
* @route '/api/v1/loan-commissions/{commission}/payment'
*/
pay.url = (args: { commission: string | number | { id: string | number } } | [commission: string | number | { id: string | number } ] | string | number | { id: string | number }, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { commission: args }
    }

    if (typeof args === 'object' && !Array.isArray(args) && 'id' in args) {
        args = { commission: args.id }
    }

    if (Array.isArray(args)) {
        args = {
            commission: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        commission: typeof args.commission === 'object'
        ? args.commission.id
        : args.commission,
    }

    return pay.definition.url
            .replace('{commission}', parsedArgs.commission.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanCommissionController::pay
* @see Modules/Loans/app/Http/Controllers/V1/LoanCommissionController.php:31
* @route '/api/v1/loan-commissions/{commission}/payment'
*/
pay.post = (args: { commission: string | number | { id: string | number } } | [commission: string | number | { id: string | number } ] | string | number | { id: string | number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: pay.url(args, options),
    method: 'post',
})

const loanCommissions = {
    index: Object.assign(index, index),
    pay: Object.assign(pay, pay),
}

export default loanCommissions