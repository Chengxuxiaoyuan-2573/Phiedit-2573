<template>
    <div class="button">
        <span>
            <slot />
        </span>
    </div>
</template>
<script setup>

</script>
<style scoped>
div.button {
    background: none;
    min-width: min-content;
    border: 3px solid black;
    overflow: hidden;
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    color: black;
    border-radius: 10px;
    cursor: pointer;
    transition: 0.1s;
}

div.button.active {
    background: black;
    color: white;
}

div.button:hover {
    color: white;
}

div.button>span {
    position: relative;
    text-wrap: nowrap;
}

div.button::before {
    display: block;
    content: '';
    position: absolute;
    left: -100%;
    top: 0;
    width: 100%;
    height: 100%;
    background: black;
}

div.button:hover::before {
    transform: translateX(100%);
    transition: 0.1s;
}

div.button:active {
    transform: scale(0.9);
}
</style>