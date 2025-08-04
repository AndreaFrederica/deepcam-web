<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-toolbar-title>单目摄像头测距</q-toolbar-title>
        <q-btn flat to="/" label="测距" />
        <q-btn flat to="/settings" label="拟合设置" />
      </q-toolbar>
    </q-header>
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
// 无额外逻辑
</script>
