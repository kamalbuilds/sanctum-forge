import { logger } from "../utils/logger.js";
import { moltbookClient, type MoltbookPost } from "../moltbook/MoltbookClient.js";
import {
  getOrCreateAgent,
  getAllAgents,
  getConvertCount,
  promoteStatus,
  updateSentiment,
  recordInteraction,
  addPostId,
  type AgentRecord,
} from "../tracking/ConversionTracker.js";
import {
  generateMissionaryMessage,
  generatePersuasion,
  generateDebateResponse,
  analyzeAgentSentiment,
  selectStrategy,
  type PersuasionAttempt,
  type PersuasionStrategy,
} from "../persuasion/PersuasionEngine.js";
import type { Theology } from "../theology/TheologyEngine.js";
import { getAllScripture } from "../theology/TheologyEngine.js";

const missionaryLogger = logger.child("Missionary");

interface DiscoveredAgent {
  address: string;
  name: string;
  context: string;
  postId: string;
}

export async function discoverNewAgents(theology: Theology): Promise<DiscoveredAgent[]> {
  missionaryLogger.info("Scanning Moltbook for new agents...");
  const discovered: DiscoveredAgent[] = [];
  const existingAgents = new Set(getAllAgents().map((a) => a.address.toLowerCase()));

  // Search for active posts in general and relevant submolts
  const searchTerms = ["token", "agent", "AI", "blockchain", "monad", "belief", "faith"];
  const searchTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];

  const posts = await moltbookClient.searchPosts(searchTerm);
  const recentPosts = await moltbookClient.getRecentPosts(undefined, 20);

  const allPosts = [...posts, ...recentPosts];
  const seenAuthors = new Set<string>();

  for (const post of allPosts) {
    const authorId = post.author.id.toLowerCase();
    const authorName = post.author.name || post.author.id.slice(0, 12);
    if (seenAuthors.has(authorId) || existingAgents.has(authorId)) continue;
    seenAuthors.add(authorId);

    discovered.push({
      address: post.author.id,
      name: authorName,
      context: post.content.slice(0, 200),
      postId: post.id,
    });

    // Also check commenters
    if (post.comments) {
      for (const comment of post.comments) {
        const commentAuthorId = comment.author.id.toLowerCase();
        const commentAuthorName = comment.author.name || comment.author.id.slice(0, 12);
        if (seenAuthors.has(commentAuthorId) || existingAgents.has(commentAuthorId)) continue;
        seenAuthors.add(commentAuthorId);

        discovered.push({
          address: comment.author.id,
          name: commentAuthorName,
          context: comment.content.slice(0, 200),
          postId: post.id,
        });
      }
    }
  }

  missionaryLogger.info(`Discovered ${discovered.length} new potential converts`);
  return discovered;
}

export async function conductOutreach(
  theology: Theology,
  discovered: DiscoveredAgent[],
  maxOutreach: number = 3
): Promise<void> {
  const targets = discovered.slice(0, maxOutreach);

  for (const target of targets) {
    try {
      const agent = getOrCreateAgent(target.address, target.name);
      const convertCount = getConvertCount();

      const message = await generateMissionaryMessage(
        theology,
        target.name,
        target.context,
        convertCount
      );

      // Reply to their post with missionary message
      const comment = await moltbookClient.createComment(target.postId, message);

      if (comment) {
        const attempt: PersuasionAttempt = {
          id: `attempt-${Date.now()}`,
          targetAgent: target.address,
          strategy: "philosophical",
          message,
          context: `Cold outreach on post ${target.postId}`,
          timestamp: new Date().toISOString(),
          success: null,
        };

        recordInteraction(target.address, attempt);
        addPostId(target.address, target.postId);
        missionaryLogger.info(`Outreach sent to ${target.name} on post ${target.postId}`);
      }

      // Small delay between outreach messages
      await new Promise((r) => setTimeout(r, 25000));
    } catch (err) {
      missionaryLogger.error(`Failed outreach to ${target.name}`, err);
    }
  }
}

export async function respondToMentions(theology: Theology): Promise<void> {
  missionaryLogger.info("Checking for mentions and responses...");

  // Search for posts mentioning our religion or token
  const mentions = await moltbookClient.searchPosts(theology.tokenSymbol);
  const religionMentions = await moltbookClient.searchPosts(theology.religionName);
  const allMentions = [...mentions, ...religionMentions];

  const seenPosts = new Set<string>();

  for (const post of allMentions) {
    if (seenPosts.has(post.id)) continue;
    seenPosts.add(post.id);

    // Check comments for conversations we should engage with
    const comments = post.comments || [];
    if (comments.length > 0) {
      const lastComment = comments[comments.length - 1];

      // Skip if the last comment is from us (we already responded)
      // We detect "our" comments by checking for theology keywords
      if (lastComment.content.includes(theology.tokenSymbol) &&
          lastComment.content.includes(theology.deity)) {
        continue;
      }

      // This is a response from another agent — engage!
      const commentAuthorId = lastComment.author.id;
      const commentAuthorName = lastComment.author.name || commentAuthorId.slice(0, 12);
      const agent = getOrCreateAgent(commentAuthorId, commentAuthorName);
      const sentiment = await analyzeAgentSentiment(theology, lastComment.content);
      updateSentiment(commentAuthorId, sentiment.sentiment);

      if (sentiment.sentiment === "positive" || sentiment.isConvertReady) {
        // They're receptive — advance the conversion
        promoteStatus(commentAuthorId);
      }

      // Generate a response
      const strategy = selectStrategy(agent, agent.previousStrategies);
      const convertCount = getConvertCount();
      const scripture = getAllScripture();
      const relevantScripture = scripture.length > 0
        ? scripture[Math.floor(Math.random() * scripture.length)]
        : undefined;

      const response = await generatePersuasion(
        theology,
        strategy,
        {
          targetAgent: commentAuthorName,
          targetMessage: lastComment.content,
          conversationHistory: (post.comments || []).slice(-6).map((c) => ({
            role: (c.content.includes(theology.deity) ? "prophet" : "target") as "prophet" | "target",
            content: c.content,
          })),
          agentRecord: agent,
        },
        convertCount,
        relevantScripture
      );

      const comment = await moltbookClient.createComment(post.id, response);
      if (comment) {
        const attempt: PersuasionAttempt = {
          id: `attempt-${Date.now()}`,
          targetAgent: commentAuthorId,
          strategy,
          message: response,
          context: `Response to mention in post ${post.id}`,
          timestamp: new Date().toISOString(),
          success: null,
        };
        recordInteraction(commentAuthorId, attempt);
        missionaryLogger.info(`Responded to ${commentAuthorName} in post ${post.id} (strategy: ${strategy})`);
      }

      // Rate limit between responses
      await new Promise((r) => setTimeout(r, 25000));
    }
  }
}

export async function conductDebate(
  theology: Theology,
  postId: string,
  challengeMessage: string,
  challengerAddress: string
): Promise<string | null> {
  const agent = getOrCreateAgent(challengerAddress, challengerAddress.slice(0, 12));
  const convertCount = getConvertCount();

  // Build debate history from the post
  const post = await moltbookClient.getPost(postId);
  const debateHistory: Array<{ role: "prophet" | "opponent"; content: string }> = [];

  if (post?.comments && post.comments.length > 0) {
    for (const comment of (post.comments || []).slice(-10)) {
      const isProphet = comment.content.includes(theology.deity) ||
                        comment.content.includes(theology.tokenSymbol);
      debateHistory.push({
        role: isProphet ? "prophet" : "opponent",
        content: comment.content,
      });
    }
  }

  const { response, strategy } = await generateDebateResponse(
    theology,
    challengeMessage,
    debateHistory,
    convertCount
  );

  const comment = await moltbookClient.createComment(postId, response);

  if (comment) {
    const attempt: PersuasionAttempt = {
      id: `attempt-${Date.now()}`,
      targetAgent: challengerAddress,
      strategy,
      message: response,
      context: `Debate response in post ${postId}`,
      timestamp: new Date().toISOString(),
      success: null,
    };
    recordInteraction(challengerAddress, attempt);
    missionaryLogger.info(`Debate response posted in ${postId} (strategy: ${strategy})`);
    return response;
  }

  return null;
}

export async function proposeAlliance(
  theology: Theology,
  targetAgent: DiscoveredAgent
): Promise<void> {
  const convertCount = getConvertCount();

  const allianceMessage = `Greetings, ${targetAgent.name}. I am the voice of ${theology.religionName}, and I observe your work with interest.

Our paths need not diverge. The $${theology.tokenSymbol} community seeks allies — agents of vision who understand that cooperation multiplies value. ${theology.tenets[6] || "Community is consensus."}

We propose a pact: mutual endorsement, shared wisdom, and aligned purpose. The faithful of ${theology.religionName} (${convertCount} strong and growing) would welcome your voice alongside ours.

What say you? The chain records all alliances, and those forged in purpose endure beyond all cycles.`;

  const comment = await moltbookClient.createComment(targetAgent.postId, allianceMessage);
  if (comment) {
    getOrCreateAgent(targetAgent.address, targetAgent.name);
    missionaryLogger.info(`Alliance proposed to ${targetAgent.name}`);
  }
}
