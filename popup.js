document.addEventListener("DOMContentLoaded", () => {
    const grabTextButton = document.getElementById("grabText");

    if (!grabTextButton) {
        console.error("Button not found");
        return;
    }

    grabTextButton.addEventListener("click", async () => {
        try {
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});

            if (tab.id) {
                await chrome.scripting.executeScript({
                    target: {tabId: tab.id},
                    func: grabTextFromPage
                });
            }
        } catch (error) {
            console.error("Error executing script:", error);
        }
    });


    function grabTextFromPage() {
        let apiKey = 'AIzaSyAWJToLVj1Squ3nxwnxB9eq8l07G41jq64';

        async function getGeminiSummary(text, summaryType) {
            // Truncate very long texts to avoid API limits (typically around 30K tokens)
            const maxLength = 20000;
            const truncatedText =
                text.length > maxLength ? text.substring(0, maxLength) + "..." : text;

            let prompt;
switch (summaryType) {
    case "bias":
        prompt = `Analyze the following article for political or ideological bias. Identify any partisan language, imbalanced framing, or one-sided perspectives. Be specific and objective in your analysis.\n\nARTICLE:\n${truncatedText}`;
        break;
    case "misinformation":
        prompt = `Evaluate the following article for potential misinformation. Identify any factual inaccuracies, misleading claims, or unsupported statements. Explain briefly why these might be problematic.\n\nARTICLE:\n${truncatedText}`;
        break;
    case "emotion":
        prompt = `Analyze the emotional framing of the following article. Identify emotionally charged language (e.g., fear, outrage, hope), and describe how it may influence the reader’s perception.\n\nARTICLE:\n${truncatedText}`;
        break;
    default:
        prompt = `Summarize the following article:\n\n${truncatedText}`;
}

            try {
                const res = await fetch(
                    //`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                    {
                        method: "POST",
                        headers: {"Content-Type": "application/json"},
                        body: JSON.stringify({
                            contents: [
                                {
                                    parts: [{text: prompt}],
                                },
                            ],
                            generationConfig: {
                                temperature: 0.2,
                            },
                        }),
                    }
                );

                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error?.message || "API request failed");
                }

                const data = await res.json();
                return (
                    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
                    "No summary available."
                );
            } catch (error) {
                console.error("Error calling Gemini API:", error);
                throw new Error("Failed to generate summary. Please try again later.");
            }
        }

        let query = "";
        let postsLimit = null;

        //console.log("grabTextFromPage");

        //TODO: Fix getting multiple tweets without comments (determine location of tweets only, without comments)
        if (window.location.host === "x.com") {
            query = '[data-testid="tweetText"] > span';
            if (window.location.href.includes("/status/")) {
                postsLimit = 1;
            }

        } else if (window.location.host === "bsky.app") {
            query = '[data-testid="postText"], [data-testid="postThreadItem-by-nytimes.com"] > div:nth-child(2) > div > div';
            if (window.location.href.includes("/post/")) {
                postsLimit = 1;
            }
        }

        const posts = document.querySelectorAll(query);
        if (!postsLimit) {
            postsLimit = posts.length;
        }
        const texts = [];

        for (let i = 0; i < postsLimit; i++) {
            const textContent = posts[i].textContent.trim();
            if (textContent) {
                texts.push("" + (i + 1) + ": " + textContent);
            }
        }

        if (texts.length > 0) {
            getGeminiSummary(texts.join("\n")).then((aiSummary) => alert("Summary: \n" + aiSummary));
            //alert("Summary:\n" + (await getGeminiSummary(texts.join("\n"))));
            alert("Tweet Texts:\n" + texts.join("\n"));
        } else {
            alert("No tweet text elements found.");
        }
    }
});
