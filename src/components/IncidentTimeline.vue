<template>
    <div v-if="updates && updates.length > 0" class="incident-timeline">
        <div v-for="update in updates" :key="update.id" class="timeline-entry">
            <div class="timeline-header">
                <span class="badge" :class="'bg-' + statusColor(update.status)">
                    {{ statusLabel(update.status) }}
                </span>
                <span class="timeline-date text-muted ms-2">
                    {{ $t("datetime", [datetimeFormat(update.createdDate)]) }}
                </span>
            </div>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div class="timeline-content mt-1" v-html="contentHTML(update.content)"></div>
        </div>
    </div>
</template>

<script>
import { marked } from "marked";
import DOMPurify from "dompurify";

export default {
    props: {
        updates: {
            type: Array,
            default: () => [],
        },
    },
    methods: {
        statusColor(status) {
            const colors = {
                investigating: "warning",
                identified: "info",
                monitoring: "primary",
                resolved: "success",
            };
            return colors[status] || "secondary";
        },

        statusLabel(status) {
            const labels = {
                investigating: "Investigating",
                identified: "Identified",
                monitoring: "Monitoring",
                resolved: "Resolved",
            };
            return labels[status] || status;
        },

        contentHTML(content) {
            if (!content) {
                return "";
            }
            return DOMPurify.sanitize(marked(content));
        },

        datetimeFormat(value) {
            return this.$root.datetimeFormat(value);
        },
    },
};
</script>

<style lang="scss" scoped>
.incident-timeline {
    border-left: 3px solid #dee2e6;
    padding-left: 15px;
    margin-top: 10px;
}

.timeline-entry {
    padding-bottom: 12px;
    margin-bottom: 12px;
    border-bottom: 1px solid #f0f0f0;

    &:last-child {
        border-bottom: none;
        margin-bottom: 0;
        padding-bottom: 0;
    }
}

.timeline-header {
    display: flex;
    align-items: center;
}

.timeline-date {
    font-size: 0.85em;
}

.timeline-content {
    font-size: 0.9em;
}
</style>
