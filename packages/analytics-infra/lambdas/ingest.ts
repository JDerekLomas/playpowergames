import type { APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, BatchWriteCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const sessionsTable = process.env.SESSIONS_TABLE as string;
const trialsTable = process.env.TRIALS_TABLE as string;
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true }
});

export const handler = async (event: any): Promise<APIGatewayProxyResult> => {
  try {
    const bodyRaw = event?.body;
    const body = typeof bodyRaw === 'string' ? JSON.parse(bodyRaw) : bodyRaw;
    const type = String(body?.type || '').trim();

    // Helper to generate ids
    const genId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    if (type === 'updateSession') {
      const parentSessionId = String(body?.parentSessionId || '');
      const sessionId = String(body?.sessionId || '');
      const hasStatus = body?.sessionStatus != null;
      const hasEnd = body?.sessionEndTime != null;
      if (!parentSessionId || !sessionId || (!hasStatus && !hasEnd)) {
        return { statusCode: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ ok: false, error: 'parentSessionId, sessionId and (sessionStatus or sessionEndTime) required' }) };
      }

      // If client provides sessionStartTime, update directly without query
      let key: { parentSessionId: string; sessionStartTime: number } | null = null;
      if (body?.sessionStartTime != null) {
        key = { parentSessionId, sessionStartTime: Number(body.sessionStartTime) };
      } else {
        // Otherwise, find the existing item to get sessionStartTime (paginate until found or done)
        let lastKey: any = undefined;
        let found: any = null;
        do {
          const q = await ddb.send(new QueryCommand({
            TableName: sessionsTable,
            KeyConditionExpression: '#p = :p',
            ExpressionAttributeNames: { '#p': 'parentSessionId', '#sid': 'sessionId' },
            ExpressionAttributeValues: { ':p': parentSessionId, ':sid': sessionId },
            FilterExpression: '#sid = :sid',
            ExclusiveStartKey: lastKey
          }));
          found = (q.Items ?? []).find(it => it.sessionId === sessionId) || null;
          lastKey = q.LastEvaluatedKey;
        } while (!found && lastKey);

        if (!found) {
          return { statusCode: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ ok: false, error: 'Session not found' }) };
        }
        key = { parentSessionId, sessionStartTime: Number(found.sessionStartTime) };
      }
      const sets: string[] = [];
      const names: Record<string, string> = {};
      const values: Record<string, any> = {};
      if (hasStatus) { sets.push('#status = :status'); names['#status'] = 'sessionStatus'; values[':status'] = String(body.sessionStatus); }
      if (hasEnd) { sets.push('#end = :end'); names['#end'] = 'sessionEndTime'; values[':end'] = Number(body.sessionEndTime); }
      const updateExpression = 'SET ' + sets.join(', ');

      await ddb.send(new UpdateCommand({ TableName: sessionsTable, Key: key!, UpdateExpression: updateExpression, ExpressionAttributeNames: names, ExpressionAttributeValues: values }));
      return { statusCode: 202, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ ok: true, parentSessionId, sessionId }) };
    }

    if (type === 'createSession') {
      const sessionId: string = body?.sessionId ?? genId();
      const parentSessionId = String(body?.parentSessionId || '');
      const gameName = String(body?.gameName || '');
      const topic = String(body?.topic || '');
      const sessionStartTime = Number(body?.sessionStartTime ?? Date.now());
      if (!parentSessionId || !gameName) {
        return { statusCode: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ ok: false, error: 'parentSessionId and gameName are required' }) };
      }

      const item = {
        parentSessionId,
        sessionStartTime,
        sessionId,
        gameName,
        topic,
        userId: body?.userId ? String(body.userId) : undefined,
        ipAddress: body?.ipAddress ? String(body.ipAddress) : undefined,
        deviceInfo: body?.deviceInfo ? String(body.deviceInfo) : undefined,
        deviceType: body?.deviceType ? String(body.deviceType) : undefined,
        sessionEndTime: body?.sessionEndTime != null ? Number(body.sessionEndTime) : undefined,
        sessionStatus: body?.sessionStatus ? String(body.sessionStatus) : 'OPEN',
        maxStreak: body?.maxStreak != null ? Number(body.maxStreak) : undefined,
        pointsAchieved: body?.pointsAchieved != null ? Number(body.pointsAchieved) : undefined,
        totalResponses: body?.totalResponses != null ? Number(body.totalResponses) : undefined,
        gameLevelInfo: body?.gameLevelInfo ? String(body.gameLevelInfo) : undefined,
        playAgainCount: body?.playAgainCount != null ? Number(body.playAgainCount) : undefined
      };

      await ddb.send(new PutCommand({ TableName: sessionsTable, Item: item }));
      return { statusCode: 202, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ ok: true, sessionId, parentSessionId, sessionStartTime }) };
    }

    if (type === 'createTrial') {
      const toArray = (v: any) => Array.isArray(v) ? v : [v];
      const trials = body?.items ?? body?.trial ?? body;
      const trialsArr = toArray(trials);
      const batch: any[] = [];
      for (const t of trialsArr) {
        const createdAt = t?.createdAt != null ? Number(t.createdAt) : Date.now();
        const trialItem = {
          sessionId: String(t?.sessionId),
          createdAt,
          userId: t?.userId ? String(t.userId) : undefined,
          questionText: t?.questionText ? String(t.questionText) : undefined,
          questionMechanic: t?.questionMechanic ? String(t.questionMechanic) : undefined,
          currentMultiplier: t?.currentMultiplier != null ? Number(t.currentMultiplier) : undefined,
          currentStreak: t?.currentStreak != null ? Number(t.currentStreak) : undefined,
          achievedPoints: t?.achievedPoints != null ? Number(t.achievedPoints) : undefined,
          questionMaxPoints: t?.questionMaxPoints != null ? Number(t.questionMaxPoints) : undefined,
          studentResponseAccuracyPercentage: t?.studentResponseAccuracyPercentage != null ? String(t.studentResponseAccuracyPercentage) : undefined,
          studentResponse: t?.studentResponse != null ? String(t.studentResponse) : undefined,
          optionsDisplay: t?.optionsDisplay ?? undefined,
          isCorrect: t?.isCorrect != null ? Boolean(t.isCorrect) : undefined
        };
        if (!trialItem.sessionId) {
          return { statusCode: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ ok: false, error: 'sessionId is required for createTrial' }) };
        }
        batch.push({ PutRequest: { Item: trialItem } });
      }

      for (let i = 0; i < batch.length; i += 25) {
        const slice = batch.slice(i, i + 25);
        await ddb.send(new BatchWriteCommand({ RequestItems: { [trialsTable]: slice } }));
      }
      return { statusCode: 202, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ ok: true, count: batch.length }) };
    }

    return { statusCode: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ ok: false, error: 'Invalid type. Use createSession | updateSession | createTrial' }) };
  } catch (err: any) {
    console.error('Ingest error:', err);
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ ok: false, error: 'Invalid payload' })
    };
  }
};