<template>
    <div class="subscribe-form mt-4">
        <div v-if="!submitted" class="d-flex align-items-center gap-2">
            <div class="input-group" style="max-width: 400px;">
                <input
                    v-model="email"
                    type="email"
                    class="form-control"
                    :placeholder="$t('Your email address')"
                    :disabled="submitting"
                    @keyup.enter="subscribe"
                />
                <button
                    class="btn btn-primary"
                    :disabled="submitting || !email"
                    @click="subscribe"
                >
                    <span v-if="submitting" class="spinner-border spinner-border-sm me-1" role="status"></span>
                    {{ $t("Subscribe") }}
                </button>
            </div>
        </div>
        <div v-else class="text-success">
            <font-awesome-icon icon="check-circle" class="me-1" />
            {{ successMsg }}
        </div>
        <div v-if="errorMsg" class="text-danger mt-1 small">
            {{ errorMsg }}
        </div>
    </div>
</template>

<script>
import axios from "axios";

export default {
    name: "SubscribeForm",
    props: {
        slug: {
            type: String,
            required: true,
        },
    },
    data() {
        return {
            email: "",
            submitting: false,
            submitted: false,
            successMsg: "",
            errorMsg: "",
        };
    },
    methods: {
        async subscribe() {
            if (!this.email) {
                return;
            }

            this.submitting = true;
            this.errorMsg = "";

            try {
                const res = await axios.post(`/api/status-page/${this.slug}/subscribe`, {
                    email: this.email,
                });

                if (res.data.ok) {
                    this.submitted = true;
                    this.successMsg = res.data.msg || "Check your email to confirm your subscription.";
                } else {
                    this.errorMsg = res.data.msg || "Something went wrong.";
                }
            } catch (error) {
                if (error.response && error.response.data) {
                    this.errorMsg = error.response.data.msg || "Something went wrong.";
                } else {
                    this.errorMsg = "Network error. Please try again.";
                }
            } finally {
                this.submitting = false;
            }
        },
    },
};
</script>

<style scoped>
.subscribe-form {
    text-align: center;
}
</style>
