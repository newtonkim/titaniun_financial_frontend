import { queryParams, type RouteQueryOptions, type RouteDefinition, applyUrlDefaults } from './../../../../wayfinder'
import documents from './documents'
import repayments from './repayments'
/**
* @see \Modules\Loans\Http\Controllers\V1\LoanApplicationController::applicationStaff
* @see Modules/Loans/app/Http/Controllers/V1/LoanApplicationController.php:31
* @route '/api/v1/loans/application-staff'
*/
export const applicationStaff = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: applicationStaff.url(options),
    method: 'get',
})

applicationStaff.definition = {
    methods: ["get","head"],
    url: '/api/v1/loans/application-staff',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanApplicationController::applicationStaff
* @see Modules/Loans/app/Http/Controllers/V1/LoanApplicationController.php:31
* @route '/api/v1/loans/application-staff'
*/
applicationStaff.url = (options?: RouteQueryOptions) => {
    return applicationStaff.definition.url + queryParams(options)
}

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanApplicationController::applicationStaff
* @see Modules/Loans/app/Http/Controllers/V1/LoanApplicationController.php:31
* @route '/api/v1/loans/application-staff'
*/
applicationStaff.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: applicationStaff.url(options),
    method: 'get',
})

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanApplicationController::applicationStaff
* @see Modules/Loans/app/Http/Controllers/V1/LoanApplicationController.php:31
* @route '/api/v1/loans/application-staff'
*/
applicationStaff.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: applicationStaff.url(options),
    method: 'head',
})

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanApplicationController::applicationPack
* @see Modules/Loans/app/Http/Controllers/V1/LoanApplicationController.php:20
* @route '/api/v1/loans/{loan}/application-pack'
*/
export const applicationPack = (args: { loan: number | { id: number } } | [loan: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: applicationPack.url(args, options),
    method: 'get',
})

applicationPack.definition = {
    methods: ["get","head"],
    url: '/api/v1/loans/{loan}/application-pack',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanApplicationController::applicationPack
* @see Modules/Loans/app/Http/Controllers/V1/LoanApplicationController.php:20
* @route '/api/v1/loans/{loan}/application-pack'
*/
applicationPack.url = (args: { loan: number | { id: number } } | [loan: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions) => {
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

    return applicationPack.definition.url
            .replace('{loan}', parsedArgs.loan.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanApplicationController::applicationPack
* @see Modules/Loans/app/Http/Controllers/V1/LoanApplicationController.php:20
* @route '/api/v1/loans/{loan}/application-pack'
*/
applicationPack.get = (args: { loan: number | { id: number } } | [loan: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: applicationPack.url(args, options),
    method: 'get',
})

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanApplicationController::applicationPack
* @see Modules/Loans/app/Http/Controllers/V1/LoanApplicationController.php:20
* @route '/api/v1/loans/{loan}/application-pack'
*/
applicationPack.head = (args: { loan: number | { id: number } } | [loan: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: applicationPack.url(args, options),
    method: 'head',
})

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanApplicationController::applicationAction
* @see Modules/Loans/app/Http/Controllers/V1/LoanApplicationController.php:38
* @route '/api/v1/loans/{loan}/application/{action}'
*/
export const applicationAction = (args: { loan: number | { id: number }, action: string | number } | [loan: number | { id: number }, action: string | number ], options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: applicationAction.url(args, options),
    method: 'post',
})

applicationAction.definition = {
    methods: ["post"],
    url: '/api/v1/loans/{loan}/application/{action}',
} satisfies RouteDefinition<["post"]>

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanApplicationController::applicationAction
* @see Modules/Loans/app/Http/Controllers/V1/LoanApplicationController.php:38
* @route '/api/v1/loans/{loan}/application/{action}'
*/
applicationAction.url = (args: { loan: number | { id: number }, action: string | number } | [loan: number | { id: number }, action: string | number ], options?: RouteQueryOptions) => {
    if (Array.isArray(args)) {
        args = {
            loan: args[0],
            action: args[1],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        loan: typeof args.loan === 'object'
        ? args.loan.id
        : args.loan,
        action: args.action,
    }

    return applicationAction.definition.url
            .replace('{loan}', parsedArgs.loan.toString())
            .replace('{action}', parsedArgs.action.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanApplicationController::applicationAction
* @see Modules/Loans/app/Http/Controllers/V1/LoanApplicationController.php:38
* @route '/api/v1/loans/{loan}/application/{action}'
*/
applicationAction.post = (args: { loan: number | { id: number }, action: string | number } | [loan: number | { id: number }, action: string | number ], options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: applicationAction.url(args, options),
    method: 'post',
})

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanWorkflowController::options
* @see Modules/Loans/app/Http/Controllers/V1/LoanWorkflowController.php:26
* @route '/api/v1/loans/options'
*/
export const options = (routeOptions?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: options.url(routeOptions),
    method: 'get',
})

options.definition = {
    methods: ["get","head"],
    url: '/api/v1/loans/options',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanWorkflowController::options
* @see Modules/Loans/app/Http/Controllers/V1/LoanWorkflowController.php:26
* @route '/api/v1/loans/options'
*/
options.url = (routeOptions?: RouteQueryOptions) => {
    return options.definition.url
    + queryParams(routeOptions)
}

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanWorkflowController::options
* @see Modules/Loans/app/Http/Controllers/V1/LoanWorkflowController.php:26
* @route '/api/v1/loans/options'
*/
options.get = (routeOptions?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: options.url(routeOptions),
    method: 'get',
})

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanWorkflowController::options
* @see Modules/Loans/app/Http/Controllers/V1/LoanWorkflowController.php:26
* @route '/api/v1/loans/options'
*/
options.head = (routeOptions?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: options.url(routeOptions),
    method: 'head',
})

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanWorkflowController::eligibility
* @see Modules/Loans/app/Http/Controllers/V1/LoanWorkflowController.php:33
* @route '/api/v1/loans/eligibility'
*/
export const eligibility = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: eligibility.url(options),
    method: 'post',
})

eligibility.definition = {
    methods: ["post"],
    url: '/api/v1/loans/eligibility',
} satisfies RouteDefinition<["post"]>

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanWorkflowController::eligibility
* @see Modules/Loans/app/Http/Controllers/V1/LoanWorkflowController.php:33
* @route '/api/v1/loans/eligibility'
*/
eligibility.url = (options?: RouteQueryOptions) => {
    return eligibility.definition.url + queryParams(options)
}

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanWorkflowController::eligibility
* @see Modules/Loans/app/Http/Controllers/V1/LoanWorkflowController.php:33
* @route '/api/v1/loans/eligibility'
*/
eligibility.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: eligibility.url(options),
    method: 'post',
})

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanWorkflowController::workflow
* @see Modules/Loans/app/Http/Controllers/V1/LoanWorkflowController.php:43
* @route '/api/v1/loans/{loan}/workflow/{action}'
*/
export const workflow = (args: { loan: number | { id: number }, action: string | number } | [loan: number | { id: number }, action: string | number ], options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: workflow.url(args, options),
    method: 'post',
})

workflow.definition = {
    methods: ["post"],
    url: '/api/v1/loans/{loan}/workflow/{action}',
} satisfies RouteDefinition<["post"]>

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanWorkflowController::workflow
* @see Modules/Loans/app/Http/Controllers/V1/LoanWorkflowController.php:43
* @route '/api/v1/loans/{loan}/workflow/{action}'
*/
workflow.url = (args: { loan: number | { id: number }, action: string | number } | [loan: number | { id: number }, action: string | number ], options?: RouteQueryOptions) => {
    if (Array.isArray(args)) {
        args = {
            loan: args[0],
            action: args[1],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        loan: typeof args.loan === 'object'
        ? args.loan.id
        : args.loan,
        action: args.action,
    }

    return workflow.definition.url
            .replace('{loan}', parsedArgs.loan.toString())
            .replace('{action}', parsedArgs.action.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanWorkflowController::workflow
* @see Modules/Loans/app/Http/Controllers/V1/LoanWorkflowController.php:43
* @route '/api/v1/loans/{loan}/workflow/{action}'
*/
workflow.post = (args: { loan: number | { id: number }, action: string | number } | [loan: number | { id: number }, action: string | number ], options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: workflow.url(args, options),
    method: 'post',
})

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanController::index
* @see Modules/Loans/app/Http/Controllers/V1/LoanController.php:25
* @route '/api/v1/loans'
*/
export const index = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

index.definition = {
    methods: ["get","head"],
    url: '/api/v1/loans',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanController::index
* @see Modules/Loans/app/Http/Controllers/V1/LoanController.php:25
* @route '/api/v1/loans'
*/
index.url = (options?: RouteQueryOptions) => {
    return index.definition.url + queryParams(options)
}

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanController::index
* @see Modules/Loans/app/Http/Controllers/V1/LoanController.php:25
* @route '/api/v1/loans'
*/
index.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanController::index
* @see Modules/Loans/app/Http/Controllers/V1/LoanController.php:25
* @route '/api/v1/loans'
*/
index.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: index.url(options),
    method: 'head',
})

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanController::store
* @see Modules/Loans/app/Http/Controllers/V1/LoanController.php:41
* @route '/api/v1/loans'
*/
export const store = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

store.definition = {
    methods: ["post"],
    url: '/api/v1/loans',
} satisfies RouteDefinition<["post"]>

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanController::store
* @see Modules/Loans/app/Http/Controllers/V1/LoanController.php:41
* @route '/api/v1/loans'
*/
store.url = (options?: RouteQueryOptions) => {
    return store.definition.url + queryParams(options)
}

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanController::store
* @see Modules/Loans/app/Http/Controllers/V1/LoanController.php:41
* @route '/api/v1/loans'
*/
store.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanController::show
* @see Modules/Loans/app/Http/Controllers/V1/LoanController.php:68
* @route '/api/v1/loans/{loan}'
*/
export const show = (args: { loan: number | { id: number } } | [loan: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})

show.definition = {
    methods: ["get","head"],
    url: '/api/v1/loans/{loan}',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanController::show
* @see Modules/Loans/app/Http/Controllers/V1/LoanController.php:68
* @route '/api/v1/loans/{loan}'
*/
show.url = (args: { loan: number | { id: number } } | [loan: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions) => {
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

    return show.definition.url
            .replace('{loan}', parsedArgs.loan.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanController::show
* @see Modules/Loans/app/Http/Controllers/V1/LoanController.php:68
* @route '/api/v1/loans/{loan}'
*/
show.get = (args: { loan: number | { id: number } } | [loan: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanController::show
* @see Modules/Loans/app/Http/Controllers/V1/LoanController.php:68
* @route '/api/v1/loans/{loan}'
*/
show.head = (args: { loan: number | { id: number } } | [loan: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: show.url(args, options),
    method: 'head',
})

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanController::update
* @see Modules/Loans/app/Http/Controllers/V1/LoanController.php:76
* @route '/api/v1/loans/{loan}'
*/
export const update = (args: { loan: number | { id: number } } | [loan: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'put'> => ({
    url: update.url(args, options),
    method: 'put',
})

update.definition = {
    methods: ["put","patch"],
    url: '/api/v1/loans/{loan}',
} satisfies RouteDefinition<["put","patch"]>

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanController::update
* @see Modules/Loans/app/Http/Controllers/V1/LoanController.php:76
* @route '/api/v1/loans/{loan}'
*/
update.url = (args: { loan: number | { id: number } } | [loan: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions) => {
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

    return update.definition.url
            .replace('{loan}', parsedArgs.loan.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanController::update
* @see Modules/Loans/app/Http/Controllers/V1/LoanController.php:76
* @route '/api/v1/loans/{loan}'
*/
update.put = (args: { loan: number | { id: number } } | [loan: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'put'> => ({
    url: update.url(args, options),
    method: 'put',
})

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanController::update
* @see Modules/Loans/app/Http/Controllers/V1/LoanController.php:76
* @route '/api/v1/loans/{loan}'
*/
update.patch = (args: { loan: number | { id: number } } | [loan: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'patch'> => ({
    url: update.url(args, options),
    method: 'patch',
})

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanController::destroy
* @see Modules/Loans/app/Http/Controllers/V1/LoanController.php:112
* @route '/api/v1/loans/{loan}'
*/
export const destroy = (args: { loan: number | { id: number } } | [loan: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: destroy.url(args, options),
    method: 'delete',
})

destroy.definition = {
    methods: ["delete"],
    url: '/api/v1/loans/{loan}',
} satisfies RouteDefinition<["delete"]>

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanController::destroy
* @see Modules/Loans/app/Http/Controllers/V1/LoanController.php:112
* @route '/api/v1/loans/{loan}'
*/
destroy.url = (args: { loan: number | { id: number } } | [loan: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions) => {
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

    return destroy.definition.url
            .replace('{loan}', parsedArgs.loan.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanController::destroy
* @see Modules/Loans/app/Http/Controllers/V1/LoanController.php:112
* @route '/api/v1/loans/{loan}'
*/
destroy.delete = (args: { loan: number | { id: number } } | [loan: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: destroy.url(args, options),
    method: 'delete',
})

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanApprovalController::__invoke
* @see Modules/Loans/app/Http/Controllers/V1/LoanApprovalController.php:15
* @route '/api/v1/loans/{loan}/approval'
*/
export const approval = (args: { loan: number | { id: number } } | [loan: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: approval.url(args, options),
    method: 'post',
})

approval.definition = {
    methods: ["post"],
    url: '/api/v1/loans/{loan}/approval',
} satisfies RouteDefinition<["post"]>

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanApprovalController::__invoke
* @see Modules/Loans/app/Http/Controllers/V1/LoanApprovalController.php:15
* @route '/api/v1/loans/{loan}/approval'
*/
approval.url = (args: { loan: number | { id: number } } | [loan: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions) => {
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

    return approval.definition.url
            .replace('{loan}', parsedArgs.loan.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanApprovalController::__invoke
* @see Modules/Loans/app/Http/Controllers/V1/LoanApprovalController.php:15
* @route '/api/v1/loans/{loan}/approval'
*/
approval.post = (args: { loan: number | { id: number } } | [loan: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: approval.url(args, options),
    method: 'post',
})

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanRejectionController::__invoke
* @see Modules/Loans/app/Http/Controllers/V1/LoanRejectionController.php:15
* @route '/api/v1/loans/{loan}/rejection'
*/
export const rejection = (args: { loan: number | { id: number } } | [loan: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: rejection.url(args, options),
    method: 'post',
})

rejection.definition = {
    methods: ["post"],
    url: '/api/v1/loans/{loan}/rejection',
} satisfies RouteDefinition<["post"]>

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanRejectionController::__invoke
* @see Modules/Loans/app/Http/Controllers/V1/LoanRejectionController.php:15
* @route '/api/v1/loans/{loan}/rejection'
*/
rejection.url = (args: { loan: number | { id: number } } | [loan: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions) => {
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

    return rejection.definition.url
            .replace('{loan}', parsedArgs.loan.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanRejectionController::__invoke
* @see Modules/Loans/app/Http/Controllers/V1/LoanRejectionController.php:15
* @route '/api/v1/loans/{loan}/rejection'
*/
rejection.post = (args: { loan: number | { id: number } } | [loan: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: rejection.url(args, options),
    method: 'post',
})

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanDisbursementController::__invoke
* @see Modules/Loans/app/Http/Controllers/V1/LoanDisbursementController.php:16
* @route '/api/v1/loans/{loan}/disbursement'
*/
export const disbursement = (args: { loan: number | { id: number } } | [loan: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: disbursement.url(args, options),
    method: 'post',
})

disbursement.definition = {
    methods: ["post"],
    url: '/api/v1/loans/{loan}/disbursement',
} satisfies RouteDefinition<["post"]>

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanDisbursementController::__invoke
* @see Modules/Loans/app/Http/Controllers/V1/LoanDisbursementController.php:16
* @route '/api/v1/loans/{loan}/disbursement'
*/
disbursement.url = (args: { loan: number | { id: number } } | [loan: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions) => {
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

    return disbursement.definition.url
            .replace('{loan}', parsedArgs.loan.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \Modules\Loans\Http\Controllers\V1\LoanDisbursementController::__invoke
* @see Modules/Loans/app/Http/Controllers/V1/LoanDisbursementController.php:16
* @route '/api/v1/loans/{loan}/disbursement'
*/
disbursement.post = (args: { loan: number | { id: number } } | [loan: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: disbursement.url(args, options),
    method: 'post',
})

const loans = {
    applicationStaff: Object.assign(applicationStaff, applicationStaff),
    applicationPack: Object.assign(applicationPack, applicationPack),
    applicationAction: Object.assign(applicationAction, applicationAction),
    options: Object.assign(options, options),
    eligibility: Object.assign(eligibility, eligibility),
    workflow: Object.assign(workflow, workflow),
    documents: Object.assign(documents, documents),
    index: Object.assign(index, index),
    store: Object.assign(store, store),
    show: Object.assign(show, show),
    update: Object.assign(update, update),
    destroy: Object.assign(destroy, destroy),
    approval: Object.assign(approval, approval),
    rejection: Object.assign(rejection, rejection),
    disbursement: Object.assign(disbursement, disbursement),
    repayments: Object.assign(repayments, repayments),
}

export default loans