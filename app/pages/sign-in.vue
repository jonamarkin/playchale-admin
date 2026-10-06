<script setup lang="ts">
/**
 * Staff sign in with the same account they use in the player app — the API has one kind of
 * account. Whether someone is staff is decided by the API afterwards, never by anything typed here.
 */
useHead({ title: 'Sign in · PlayChale Admin' })

const api = useAdminApi()
const { reload } = useStaffSession()
const route = useRoute()

const step = ref<'contact' | 'code'>('contact')
const contact = ref('')
const code = ref('')
const busy = ref(false)
const problem = ref<string | null>(null)
/** Only a dev build hands the code back; it is shown so local work needs no inbox. */
const devCode = ref<string | null>(null)

/** An email address, or a phone number written the Ghanaian way (024…) or the international one. */
const to = computed(() => {
  const value = contact.value.trim()
  if (value.includes('@')) return { email: value.toLowerCase() }
  const digits = value.replace(/[^\d+]/g, '')
  return { phone: digits.startsWith('+') ? digits : digits.startsWith('0') ? `+233${digits.slice(1)}` : `+${digits}` }
})

const send = async () => {
  if (!contact.value.trim()) return
  busy.value = true
  problem.value = null
  try {
    devCode.value = (await api.auth.requestCode(to.value)).code ?? null
    step.value = 'code'
  }
  catch (e) {
    problem.value = errorMessage(e)
  }
  finally {
    busy.value = false
  }
}

const verify = async () => {
  if (!code.value.trim()) return
  busy.value = true
  problem.value = null
  try {
    await api.auth.signIn(to.value, code.value.trim())
    await reload()
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') ? route.query.redirect : '/'
    await navigateTo(redirect)
  }
  catch (e) {
    problem.value = errorMessage(e)
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-[420px] pt-[12vh]">
    <div class="flex items-center gap-2">
      <img src="/favicon.svg" alt="" class="size-7">
      <span class="text-[18px] font-semibold">PlayChale</span>
      <BasePill tone="accent" icon="ph:shield-check-fill">Admin</BasePill>
    </div>
    <h1 class="mt-8 text-[28px] leading-9 font-semibold">Sign in</h1>

    <form v-if="step === 'contact'" class="mt-6 space-y-4" @submit.prevent="send">
      <BaseField v-slot="{ id, describedBy }" label="Email or phone" :error="problem">
        <BaseInput :id="id" v-model="contact" icon="ph:envelope-simple" placeholder="you@playchale.com" autocomplete="username" :described-by="describedBy" />
      </BaseField>
      <BaseButton type="submit" block :loading="busy">Send a code</BaseButton>
    </form>

    <form v-else class="mt-6 space-y-4" @submit.prevent="verify">
      <BaseField v-slot="{ id, describedBy }" label="The 6-digit code" :hint="`Sent to ${contact}`" :error="problem">
        <BaseInput :id="id" v-model="code" inputmode="numeric" autocomplete="one-time-code" placeholder="123456" :maxlength="6" :described-by="describedBy" />
      </BaseField>
      <p v-if="devCode" class="rounded-[12px] bg-subtle px-3 py-2 text-[13px] text-body">Dev build — no message was sent. The code is <strong class="tabular-nums">{{ devCode }}</strong>.</p>
      <BaseButton type="submit" block :loading="busy">Sign in</BaseButton>
      <button type="button" class="w-full text-[14px] text-mute hover:text-ink" @click="step = 'contact'; code = ''; problem = null">Use a different email or phone</button>
    </form>
  </div>
</template>
