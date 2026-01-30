import type { APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const sessionsTable = process.env.SESSIONS_TABLE as string;
const trialsTable = process.env.TRIALS_TABLE as string;
const sessionsGsi = process.env.SESSIONS_GSI as string;
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true }
});

function appendFilter(existing: string, clause: string): string {
  return existing ? `${existing} AND ${clause}` : clause;
}

export const handler = async (event: any): Promise<APIGatewayProxyResult> => {
  const qs = event?.queryStringParameters || {};
  const type = qs.type || 'sessionData'; // sessionData | trialsData
  const gameId = qs.gameId || null; // gameName
  const sessionId = qs.sessionId || null;
  const parentSessionId = qs.parentSessionId || null;
  const sessionStatus = qs.sessionStatus || null; // OPEN | CLOSED
  const startTime = qs.startTime ? Number(qs.startTime) : null; // single or range start
  const endTime = qs.endTime ? Number(qs.endTime) : null; // range end
  const createdAt = qs.createdAt ? Number(qs.createdAt) : null; // single timestamp for trials
  const createdAtEnd = qs.createdAtEnd ? Number(qs.createdAtEnd) : null; // range end for trials
  const sortAsc = qs.sort === 'asc';
  const limit = Number(qs.limit || 20);
  const nextToken = qs.nextToken ? JSON.parse(Buffer.from(qs.nextToken, 'base64').toString('utf8')) : undefined;

  if (type === 'trialsData') {
    if (!sessionId) {
      // Return all trials (scan) with optional createdAt filters
      let filterExpr = '';
      const names: Record<string, string> = {};
      const vals: Record<string, any> = {};
      if (createdAt != null && createdAtEnd != null) { filterExpr = '#c BETWEEN :c1 AND :c2'; names['#c'] = 'createdAt'; vals[':c1'] = createdAt; vals[':c2'] = createdAtEnd; }
      else if (createdAt != null) { filterExpr = '#c = :c'; names['#c'] = 'createdAt'; vals[':c'] = createdAt; }

      const result = await ddb.send(new ScanCommand({
        TableName: trialsTable,
        FilterExpression: filterExpr || undefined,
        ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
        ExpressionAttributeValues: Object.keys(vals).length ? vals : undefined,
        Limit: limit,
        ExclusiveStartKey: nextToken
      }));
      let items = result.Items ?? [];
      // Optional client-side sort for page
      if (items.length > 1) {
        items = items.sort((a: any, b: any) => (sortAsc ? 1 : -1) * ((a.createdAt ?? 0) - (b.createdAt ?? 0)));
      }
      const newNextToken = result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') : null;
      return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ ok: true, type, limit, items, nextToken: newNextToken }) };
    }
    // Query trials by sessionId (primary key) with pagination on createdAt
    const keyExpr = '#s = :s';
    let rangeExpr = '';
    const names: Record<string, string> = { '#s': 'sessionId' };
    const vals: Record<string, any> = { ':s': sessionId };
    if (createdAt != null && createdAtEnd != null) { rangeExpr = ' AND #c BETWEEN :c1 AND :c2'; names['#c'] = 'createdAt'; vals[':c1'] = createdAt; vals[':c2'] = createdAtEnd; }
    else if (createdAt != null) { rangeExpr = ' AND #c = :c'; names['#c'] = 'createdAt'; vals[':c'] = createdAt; }

    const result = await ddb.send(new QueryCommand({
      TableName: trialsTable,
      KeyConditionExpression: keyExpr + rangeExpr,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: vals,
      Limit: limit,
      ExclusiveStartKey: nextToken,
      ScanIndexForward: sortAsc
    }));

    const items = result.Items ?? [];
    const newNextToken = result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') : null;
    return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ ok: true, type, sessionId, limit, items, nextToken: newNextToken }) };
  }

  // sessionData branch
  if (!gameId && !parentSessionId) {
    // Return all sessions (scan) with optional filters
    let filterExpr = '';
    const names: Record<string, string> = {};
    const vals: Record<string, any> = {};
    if (sessionStatus) { filterExpr = appendFilter(filterExpr, '#status = :status'); names['#status'] = 'sessionStatus'; vals[':status'] = sessionStatus; }
    if (startTime != null && endTime != null) { filterExpr = appendFilter(filterExpr, '#t BETWEEN :t1 AND :t2'); names['#t'] = 'sessionStartTime'; vals[':t1'] = startTime; vals[':t2'] = endTime; }
    else if (startTime != null) { filterExpr = appendFilter(filterExpr, '#t = :t'); names['#t'] = 'sessionStartTime'; vals[':t'] = startTime; }

    const result = await ddb.send(new ScanCommand({
      TableName: sessionsTable,
      FilterExpression: filterExpr || undefined,
      ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
      ExpressionAttributeValues: Object.keys(vals).length ? vals : undefined,
      Limit: limit,
      ExclusiveStartKey: nextToken
    }));
    let items = result.Items ?? [];
    if (items.length > 1) {
      items = items.sort((a: any, b: any) => (sortAsc ? 1 : -1) * ((a.sessionStartTime ?? 0) - (b.sessionStartTime ?? 0)));
    }
    const newNextToken = result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') : null;
    return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ ok: true, type, limit, items, nextToken: newNextToken }) };
  }

  let result;
  if (parentSessionId) {
    // Query by parentSessionId (PK), with optional time range on SK
    let keyExpr = '#p = :p';
    const names: Record<string, string> = { '#p': 'parentSessionId' };
    const vals: Record<string, any> = { ':p': parentSessionId };
    if (startTime != null && endTime != null) { keyExpr += ' AND #t BETWEEN :t1 AND :t2'; names['#t'] = 'sessionStartTime'; vals[':t1'] = startTime; vals[':t2'] = endTime; }
    else if (startTime != null) { keyExpr += ' AND #t = :t'; names['#t'] = 'sessionStartTime'; vals[':t'] = startTime; }

    let filterExpr = '';
    if (sessionStatus) { filterExpr = '#status = :status'; names['#status'] = 'sessionStatus'; vals[':status'] = sessionStatus; }

    result = await ddb.send(new QueryCommand({
      TableName: sessionsTable,
      KeyConditionExpression: keyExpr,
      FilterExpression: filterExpr || undefined,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: vals,
      Limit: limit,
      ExclusiveStartKey: nextToken,
      ScanIndexForward: sortAsc
    }));
  } else {
    // Query via GSI by gameName, with optional time range on SK
    let keyExpr = '#g = :g';
    const names: Record<string, string> = { '#g': 'gameName' };
    const vals: Record<string, any> = { ':g': gameId };
    if (startTime != null && endTime != null) { keyExpr += ' AND #t BETWEEN :t1 AND :t2'; names['#t'] = 'sessionStartTime'; vals[':t1'] = startTime; vals[':t2'] = endTime; }
    else if (startTime != null) { keyExpr += ' AND #t = :t'; names['#t'] = 'sessionStartTime'; vals[':t'] = startTime; }
    let filterExpr = '';
    if (sessionStatus) { filterExpr = '#status = :status'; names['#status'] = 'sessionStatus'; vals[':status'] = sessionStatus; }

    result = await ddb.send(new QueryCommand({
      TableName: sessionsTable,
      IndexName: sessionsGsi,
      KeyConditionExpression: keyExpr,
      FilterExpression: filterExpr || undefined,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: vals,
      Limit: limit,
      ExclusiveStartKey: nextToken,
      ScanIndexForward: sortAsc
    }));
  }

  const items = result.Items ?? [];
  const newNextToken = result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') : null;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({ ok: true, type, gameId, parentSessionId, limit, items, nextToken: newNextToken })
  };
};