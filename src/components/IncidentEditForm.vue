<template>
    <div
        class="shadow-box alert mb-4 p-4 incident"
        role="alert"
        :class="'bg-' + modelValue.style"
        data-testid="incident-edit"
    >
        <strong>{{ $t("Title") }}:</strong>
        <Editable
            :model-value="modelValue.title"
            tag="h4"
            :contenteditable="true"
            :noNL="true"
            class="alert-heading"
            data-testid="incident-title"
            @update:model-value="updateField('title', $event)"
        />

        <strong>{{ $t("Content") }}:</strong>
        <Editable
            :model-value="modelValue.content"
            tag="div"
            :contenteditable="true"
            class="content"
            data-testid="incident-content-editable"
            @update:model-value="updateField('content', $event)"
        />
        <div class="form-text">
            {{ $t("markdownSupported") }}
        </div>

        <div class="row mt-3 mb-3">
            <div class="col-auto">
                <label class="form-label fw-bold">Severity:</label>
                <div class="dropdown d-inline-block ms-1">
                    <button
                        class="btn btn-sm btn-secondary dropdown-toggle"
                        type="button"
                        data-bs-toggle="dropdown"
                    >
                        {{ severityLabel }}
                    </button>
                    <ul class="dropdown-menu">
                        <li><a class="dropdown-item" href="#" @click.prevent="updateField('severity', 'minor')">Minor</a></li>
                        <li><a class="dropdown-item" href="#" @click.prevent="updateField('severity', 'major')">Major</a></li>
                        <li><a class="dropdown-item" href="#" @click.prevent="updateField('severity', 'critical')">Critical</a></li>
                    </ul>
                </div>
            </div>
            <div class="col-auto">
                <label class="form-label fw-bold">Status:</label>
                <div class="dropdown d-inline-block ms-1">
                    <button
                        class="btn btn-sm btn-secondary dropdown-toggle"
                        type="button"
                        data-bs-toggle="dropdown"
                    >
                        {{ statusLabel }}
                    </button>
                    <ul class="dropdown-menu">
                        <li><a class="dropdown-item" href="#" @click.prevent="updateField('status', 'investigating')">Investigating</a></li>
                        <li><a class="dropdown-item" href="#" @click.prevent="updateField('status', 'identified')">Identified</a></li>
                        <li><a class="dropdown-item" href="#" @click.prevent="updateField('status', 'monitoring')">Monitoring</a></li>
                        <li><a class="dropdown-item" href="#" @click.prevent="updateField('status', 'resolved')">Resolved</a></li>
                    </ul>
                </div>
            </div>
        </div>

        <div class="mt-3">
            <button class="btn btn-light me-2" data-testid="post-incident-button" @click="$emit('post')">
                <font-awesome-icon icon="bullhorn" />
                {{ $t("Post") }}
            </button>

            <button class="btn btn-light me-2" @click="$emit('cancel')">
                <font-awesome-icon icon="times" />
                {{ $t("Cancel") }}
            </button>

            <div class="dropdown d-inline-block me-2">
                <button
                    id="dropdownMenuButton1"
                    class="btn btn-secondary dropdown-toggle"
                    type="button"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                >
                    {{ $t("Style") }}: {{ $t(modelValue.style) }}
                </button>
                <ul class="dropdown-menu" aria-labelledby="dropdownMenuButton1">
                    <li>
                        <a class="dropdown-item" href="#" @click.prevent="updateField('style', 'info')">
                            {{ $t("info") }}
                        </a>
                    </li>
                    <li>
                        <a class="dropdown-item" href="#" @click.prevent="updateField('style', 'warning')">
                            {{ $t("warning") }}
                        </a>
                    </li>
                    <li>
                        <a class="dropdown-item" href="#" @click.prevent="updateField('style', 'danger')">
                            {{ $t("danger") }}
                        </a>
                    </li>
                    <li>
                        <a class="dropdown-item" href="#" @click.prevent="updateField('style', 'primary')">
                            {{ $t("primary") }}
                        </a>
                    </li>
                    <li>
                        <a class="dropdown-item" href="#" @click.prevent="updateField('style', 'light')">
                            {{ $t("light") }}
                        </a>
                    </li>
                    <li>
                        <a class="dropdown-item" href="#" @click.prevent="updateField('style', 'dark')">
                            {{ $t("dark") }}
                        </a>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: "IncidentEditForm",
    props: {
        modelValue: {
            type: Object,
            required: true,
        },
    },
    emits: ["update:modelValue", "post", "cancel"],
    computed: {
        severityLabel() {
            const labels = { minor: "Minor", major: "Major", critical: "Critical" };
            return labels[this.modelValue.severity] || "Minor";
        },
        statusLabel() {
            const labels = { investigating: "Investigating", identified: "Identified", monitoring: "Monitoring", resolved: "Resolved" };
            return labels[this.modelValue.status] || "Investigating";
        },
    },
    methods: {
        updateField(field, value) {
            this.$emit("update:modelValue", {
                ...this.modelValue,
                [field]: value,
            });
        },
    },
};
</script>

<style lang="scss" scoped>
.incident {
    .content {
        &[contenteditable="true"] {
            min-height: 60px;
        }
    }
}
</style>
