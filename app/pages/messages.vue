<script setup lang="ts">
import type { AdminMessage } from '~/types/admin'

/**
 * What's being said in games, newest first, and a way to take something down when nobody in the
 * game will. The host can already remove anything in their own game; this is the backstop.
 * Removal asks why, and the answer is recorded with the staff member's name.
 */
useHead({ title: 'Messages · PlayChale Admin' })

const api = useAdminApi()
const notify = useNotify()

const { data: messages, status, error, refresh } = await useAsyncData<AdminMessage[]>(
  'admin:messages',
  () => api.admin.messages(),
  { default: () => [], lazy: true },
)

/** The message being taken down, and why — asked on the page, not in a browser prompt. */
const removing = ref<AdminMessage | null>(null)
const why = ref('')
const busy = ref(false)

const confirmRemove = async () => {
  if (!removing.value) return
  busy.value = true
  try {
    await api.admin.removeMessage(removing.value.id, why.value.trim() || undefined)
    messages.value = messages.value.filter(m => m.id !== removing.value!.id)
    notify.success('Message taken down', 'ph:trash-bold')
    removing.value = null
    why.value = ''
  }
  catch (e) {
    notify.error(errorMessage(e))
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="pb-24">
    <h1 class="text-[28px] leading-9 font-semibold">Messages</h1>
    <p class="mt-1 text-[15px] text-body">Talk in games, newest first. Hosts can remove anything in their own game; this is for when they won’t.</p>

    <BaseEmptyState v-if="error" icon="ph:wifi-slash-fill" tone="error" title="Couldn’t load messages" :description="errorMessage(error)" class="mt-6">
      <BaseButton size="sm" @click="refresh()">Try again</BaseButton>
    </BaseEmptyState>

    <div v-else-if="status === 'pending' && !messages.length" class="mt-6 space-y-2">
      <BaseSkeleton v-for="n in 5" :key="n" class="h-20 rounded-[14px]" />
    </div>

    <BaseEmptyState v-else-if="!messages.length" icon="ph:chat-circle" title="Nothing said yet" description="Messages from games appear here as they’re written." class="mt-6" />

    <ul v-else aria-label="Messages" class="mt-6 space-y-2">
      <li v-for="m in messages" :key="m.id" class="rounded-[14px] bg-surface p-4 shadow-pill">
        <div class="flex items-start gap-3">
          <div class="min-w-0 flex-1">
            <p class="flex flex-wrap items-baseline gap-x-2 text-[13px] text-mute">
              <span class="font-medium text-ink">{{ m.saidByName }}</span>
              <span>in</span>
              <a :href="`https://playchale.com/games/${m.gameId}`" target="_blank" rel="noopener" class="truncate text-brand hover:underline">{{ m.gameTitle }}</a>
              <span>· {{ formatRelative(m.at) }}</span>
            </p>
            <p class="mt-1 text-[15px] leading-6 break-words whitespace-pre-wrap">{{ m.body }}</p>
          </div>
          <BaseButton v-if="removing?.id !== m.id" variant="ghost" size="sm" :aria-label="`Take down ${m.saidByName}'s message`" @click="removing = m">
            <Icon name="ph:trash" class="size-4" />
          </BaseButton>
        </div>

        <form v-if="removing?.id === m.id" class="mt-3 flex flex-wrap items-end gap-2 border-t border-hairline pt-3" @submit.prevent="confirmRemove">
          <BaseField v-slot="{ id }" label="Why it’s coming down" class="min-w-0 flex-1">
            <BaseInput :id="id" v-model="why" placeholder="e.g. abuse, spam, a phone number" />
          </BaseField>
          <BaseButton type="submit" variant="danger" size="sm" :loading="busy">Take it down</BaseButton>
          <BaseButton type="button" variant="ghost" size="sm" :disabled="busy" @click="removing = null">Keep it</BaseButton>
        </form>
      </li>
    </ul>
  </div>
</template>
