<template>
    <div ref="modal" class="modal fade" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">
                        {{ $t("Edit Incident") }}
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form @submit.prevent="submit">
                        <div class="mb-3">
                            <label for="incident-title" class="form-label">{{ $t("Title") }}</label>
                            <input
                                id="incident-title"
                                v-model="form.title"
                                type="text"
                                class="form-control"
                                :placeholder="$t('Incident title')"
                                required
                            />
                        </div>

                        <div class="mb-3">
                            <label for="incident-content" class="form-label">{{ $t("Content") }}</label>
                            <textarea
                                id="incident-content"
                                v-model="form.content"
                                class="form-control"
                                rows="4"
                                :placeholder="$t('Incident description')"
                                required
                            ></textarea>
                        </div>

                        <div class="row mb-3">
                            <div class="col-6">
                                <label for="incident-severity" class="form-label">{{ $t("Severity") }}</label>
                                <select id="incident-severity" v-model="form.severity" class="form-select">
                                    <option value="minor">Minor</option>
                                    <option value="major">Major</option>
                                    <option value="critical">Critical</option>
                                </select>
                            </div>
                            <div class="col-6">
                                <label for="incident-status" class="form-label">{{ $t("Status") }}</label>
                                <select id="incident-status" v-model="form.status" class="form-select">
                                    <option value="investigating">Investigating</option>
                                    <option value="identified">Identified</option>
                                    <option value="monitoring">Monitoring</option>
                                    <option value="resolved">Resolved</option>
                                </select>
                            </div>
                        </div>

                        <div class="mb-3">
                            <label for="incident-style" class="form-label">{{ $t("Style") }}</label>
                            <select id="incident-style" v-model="form.style" class="form-select">
                                <option value="info">{{ $t("info") }}</option>
                                <option value="warning">
                                    {{ $t("warning") }}
                                </option>
                                <option value="danger">
                                    {{ $t("danger") }}
                                </option>
                                <option value="primary">
                                    {{ $t("primary") }}
                                </option>
                                <option value="light">{{ $t("light") }}</option>
                                <option value="dark">{{ $t("dark") }}</option>
                            </select>
                        </div>

                        <div class="mb-3 form-check">
                            <input id="incident-pin" v-model="form.pin" type="checkbox" class="form-check-input" />
                            <label for="incident-pin" class="form-check-label">
                                {{ $t("Pin this incident") }}
                            </label>
                            <div class="form-text">
                                {{ $t("Pinned incidents are shown prominently on the status page") }}
                            </div>
                        </div>
                    </form>

                    <!-- Post Incident Update Section -->
                    <div v-if="incidentId" class="border-top pt-3 mt-3">
                        <h6>Post Update</h6>
                        <div class="mb-3">
                            <label for="update-status" class="form-label">New Status</label>
                            <select id="update-status" v-model="updateForm.status" class="form-select">
                                <option value="investigating">Investigating</option>
                                <option value="identified">Identified</option>
                                <option value="monitoring">Monitoring</option>
                                <option value="resolved">Resolved</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label for="update-content" class="form-label">Update Content</label>
                            <textarea
                                id="update-content"
                                v-model="updateForm.content"
                                class="form-control"
                                rows="3"
                                placeholder="Describe what changed..."
                            ></textarea>
                        </div>
                        <button
                            type="button"
                            class="btn btn-outline-primary btn-sm"
                            :disabled="processingUpdate"
                            @click="postUpdate"
                        >
                            <span v-if="processingUpdate" class="spinner-border spinner-border-sm me-1" role="status"></span>
                            Post Update
                        </button>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                        {{ $t("Cancel") }}
                    </button>
                    <button type="button" class="btn btn-primary" :disabled="processing" @click="submit">
                        <span v-if="processing" class="spinner-border spinner-border-sm me-1" role="status"></span>
                        {{ $t("Save") }}
                    </button>
                </div>
            </div>
        </div>
    </div>

    <Confirm
        ref="confirmDelete"
        btn-style="btn-danger"
        :yes-text="$t('Yes')"
        :no-text="$t('No')"
        @yes="confirmDeleteIncident"
    >
        {{ $t("deleteIncidentMsg") }}
    </Confirm>
</template>

<script>
import { Modal } from "bootstrap";
import Confirm from "./Confirm.vue";

export default {
    name: "IncidentManageModal",
    components: {
        Confirm,
    },
    props: {
        slug: {
            type: String,
            required: true,
        },
    },
    emits: ["incident-updated"],
    data() {
        return {
            modal: null,
            processing: false,
            processingUpdate: false,
            incidentId: null,
            pendingDeleteIncident: null,
            form: {
                title: "",
                content: "",
                style: "warning",
                severity: "minor",
                status: "investigating",
                pin: true,
            },
            updateForm: {
                status: "investigating",
                content: "",
            },
        };
    },
    mounted() {
        this.modal = new Modal(this.$refs.modal);
    },
    methods: {
        /**
         * Show the modal for editing an existing incident
         * @param {object} incident - The incident to edit
         * @returns {void}
         */
        showEdit(incident) {
            this.incidentId = incident.id;
            this.form = {
                title: incident.title,
                content: incident.content,
                style: incident.style || "warning",
                severity: incident.severity || "minor",
                status: incident.status || "investigating",
                pin: !!incident.pin,
            };
            this.updateForm = {
                status: incident.status || "investigating",
                content: "",
            };
            this.modal.show();
        },

        /**
         * Show delete confirmation dialog
         * @param {object} incident - The incident to delete
         * @returns {void}
         */
        showDelete(incident) {
            this.pendingDeleteIncident = incident;
            this.$refs.confirmDelete.show();
        },

        /**
         * Submit the form to edit the incident
         * @returns {void}
         */
        submit() {
            if (!this.form.title || this.form.title.trim() === "") {
                this.$root.toastError(this.$t("Please input title"));
                return;
            }

            if (!this.form.content || this.form.content.trim() === "") {
                this.$root.toastError(this.$t("Please input content"));
                return;
            }

            this.processing = true;

            this.$root.getSocket().emit("editIncident", this.slug, this.incidentId, this.form, (res) => {
                this.processing = false;
                this.$root.toastRes(res);
                if (res.ok) {
                    this.modal.hide();
                    this.$emit("incident-updated");
                }
            });
        },

        /**
         * Post an incident update
         * @returns {void}
         */
        postUpdate() {
            if (!this.updateForm.content || this.updateForm.content.trim() === "") {
                this.$root.toastError("Please input update content");
                return;
            }

            this.processingUpdate = true;

            this.$root.getSocket().emit(
                "postIncidentUpdate",
                this.slug,
                this.incidentId,
                this.updateForm,
                (res) => {
                    this.processingUpdate = false;
                    if (res.ok) {
                        this.$root.toastRes(res);
                        this.updateForm.content = "";
                        this.$emit("incident-updated");
                    } else {
                        this.$root.toastError(res.msg);
                    }
                }
            );
        },

        /**
         * Confirm and delete the incident
         * @returns {void}
         */
        confirmDeleteIncident() {
            if (!this.pendingDeleteIncident) {
                return;
            }

            this.$root.getSocket().emit("deleteIncident", this.slug, this.pendingDeleteIncident.id, (res) => {
                this.$root.toastRes(res);
                if (res.ok) {
                    this.$emit("incident-updated");
                }
                this.pendingDeleteIncident = null;
            });
        },
    },
};
</script>

<style lang="scss" scoped>
.modal-body {
    .form-text {
        font-size: 0.875rem;
    }
}
</style>
