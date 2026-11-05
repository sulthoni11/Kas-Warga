import { EventEmitter } from 'node:events';

/** Kanal SSE per komunitas (FR-07). In-memory cukup untuk satu node demo. */
export const communityEvents = new EventEmitter();
communityEvents.setMaxListeners(500);

export function channelFor(communityId) {
  return `community:${communityId}`;
}

export function emitCommunityUpdate(communityId, payload) {
  communityEvents.emit(channelFor(communityId), payload);
}
