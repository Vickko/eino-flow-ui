<template>
  <div class="flex h-screen w-full items-center justify-center bg-background text-foreground">
    <div
      class="rounded-xl border border-border/40 bg-background/70 px-8 py-10 text-center shadow-panel"
    >
      <p class="text-sm text-muted-foreground">404</p>
      <h1 class="mt-2 text-2xl font-semibold">页面不存在</h1>
      <p class="mt-2 text-sm text-muted-foreground">请检查地址，或返回首页继续使用。</p>
      <router-link
        to="/"
        class="mt-6 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
      >
        返回首页
      </router-link>
    </div>
  </div>
</template>
