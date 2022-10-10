class GlobalRateLimiterService {
    MINUTE_IN_MILLIS = 1000 * 60;

    constructor(configService) {
        this.allowedRequestsPerMinute = configService.getValue('allowedRequestsPerMinute') || 1;
        this.currentInterval = this.getCurrentInterval();
        this.currentRequestsLeft = this.allowedRequestsPerMinute;
    }

    getCurrentInterval() {
        return Math.floor(Date.now() / this.MINUTE_IN_MILLIS);
    }

    requestAllowed() {
        const interval = this.getCurrentInterval();
        if (interval === this.currentInterval) {
            this.currentRequestsLeft = this.currentRequestsLeft - 1;
            if (this.currentRequestsLeft < 0) this.currentRequestsLeft = 0;
            return this.currentRequestsLeft > 0;
        }
        this.currentInterval = interval;
        this.currentRequestsLeft = this.allowedRequestsPerMinute - 1;
        return true;
    }
}

module.exports = GlobalRateLimiterService;
