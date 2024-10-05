import { Octokit } from "octokit";
var gh = new Octokit({
    auth: process.env.GITHUB_TOKEN,
});

async function main() {
    const activity = await recentActivity();

    if (!activity) {
        console.log("Couldn't find any recent activity for typescript-bot");
        throw new Error();
    }
    const [anyRecent, botRecent] = activity;

    console.log();
    console.log("Time since typescript-bot's last activity: " + (new Date().valueOf() - botRecent.valueOf()) / 1000);
    console.log(
        "Time between most recent activity and typescript-bot's most recent activity: "
            + (anyRecent.valueOf() - botRecent.valueOf()) / 1000,
    );
    if (
        (new Date().valueOf() - botRecent.valueOf()) > 7200000 && (anyRecent.valueOf() - botRecent.valueOf()) > 7200000
    ) {
        console.log("typescript-bot hasn't responded or been active in over 2 hours (7200 seconds)");
        throw new Error();
    }

    // Call the new function to log event types in the last hour
    await logEventTypes();
}

/** @returns {Promise<[Date, Date] | undefined>} */
async function recentActivity() {
    const dtEvents = await gh.rest.activity.listRepoEvents({ owner: "DefinitelyTyped", repo: "DefinitelyTyped" });
    let latestEvent;
    for (const event of dtEvents.data) {
        if (!event.created_at) continue;
        latestEvent = new Date(event.created_at);
        break;
    }
    if (!latestEvent) {
        throw new Error("couldn't get events for DefinitelyTyped repo");
    }

    const events = await gh.rest.activity.listPublicEventsForUser({ username: "typescript-bot" });
    for (const event of events.data) {
        if (!event.created_at) continue;
        if (event.repo.name === "DefinitelyTyped/DefinitelyTyped") {
            return [latestEvent, new Date(event.created_at)];
        }
    }
}

/**
 * Logs the types of events performed by typescript-bot in the last hour.
 */
async function logEventTypes() {
    const events = await gh.rest.activity.listPublicEventsForUser({ username: "typescript-bot" });

    const eventCounts: Record<string, number> = {};
    const oneHourAgo = new Date().getTime() - 3600000;

    console.log("Events in the last hour:");
    
    for (const event of events.data) {
        if (!event.created_at) continue;
        const eventTime = new Date(event.created_at).getTime();

        // Only consider events from the last hour
        if (eventTime >= oneHourAgo) {
            const eventType = event.type || "UnknownEvent";
            eventCounts[eventType] = (eventCounts[eventType] || 0) + 1;
        }
    }

    if (Object.keys(eventCounts).length === 0) {
        console.log("No events recorded for typescript-bot in the last hour.");
    } else {
        console.log("Event Type Counts in the Last Hour:");
        for (const [eventType, count] of Object.entries(eventCounts)) {
            console.log(`${eventType}: ${count} occurrence(s)`);
        }
    }
}

main().catch(e => {
    console.log(e);
    process.exit(1);
});
