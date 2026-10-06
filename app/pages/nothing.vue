<script setup lang="ts">
/**
 * Signed in, but not staff. Deliberately says almost nothing, and does not sign them out on its own:
 * the session is shared with the player app, so that would sign them out of PlayChale too.
 */
useHead({ title: 'PlayChale' })
const { signOut } = useStaffSession()
</script>

<template>
  <div class="mx-auto max-w-[420px] pt-[18vh] text-center">
    <Icon name="ph:lock-simple" class="mx-auto size-10 text-mute" />
    <h1 class="mt-4 text-[22px] font-semibold">There’s nothing here for this account</h1>
    <p class="mt-2 text-[15px] text-body">If you play on PlayChale, you’ll find everything at playchale.com.</p>
    <div class="mt-6 flex justify-center gap-3">
      <BaseButton to="https://playchale.com" size="sm">Go to PlayChale</BaseButton>
      <BaseButton variant="secondary" size="sm" @click="signOut">Sign out</BaseButton>
    </div>
  </div>
</template>
