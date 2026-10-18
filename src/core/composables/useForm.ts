import { reactive, ref, toRaw, type UnwrapNestedRefs } from 'vue'
import { ApiError, type ValidationErrors } from '@/core/api/http'

export function useForm<T extends object, TResult = unknown>(initial: T, submitter: (data: T) => Promise<TResult>) {
  const data = reactive(structuredClone(initial)) as UnwrapNestedRefs<T>
  const errors = ref<ValidationErrors>({})
  const message = ref<string | null>(null)
  const processing = ref(false)

  async function submit(): Promise<TResult | undefined> {
    processing.value = true
    errors.value = {}
    message.value = null

    try {
      return await submitter(structuredClone(toRaw(data)) as T)
    } catch (exception) {
      if (exception instanceof ApiError) {
        errors.value = exception.errors
        message.value = exception.message
      } else {
        message.value = exception instanceof Error ? exception.message : 'Request failed.'
      }
    } finally {
      processing.value = false
    }
  }

  function error(field: string): string | undefined {
    return errors.value[field]?.[0]
  }

  return { data, errors, message, processing, submit, error }
}
