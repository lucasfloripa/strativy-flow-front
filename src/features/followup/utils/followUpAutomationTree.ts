import { toFollowUpActionPayload } from '../../../core/components/followUpActionDraft'
import { fromFollowUpActionPayload } from '../../../core/components/followUpActionDraft'
import type { FollowUpActionDraft } from '../../../core/components/followUpActionDraft'
import type {
  CreateFollowUpStepTreeItemPayload,
  FollowUpActionResponse,
  FollowUpActionStatus,
  FollowUpActionType,
  FollowUpStepTreeActionType,
  FollowUpStepTreeConditionType,
} from '../../webhook/types/webhook.types'

type AutomationAction =
  | 'createFollowUp'
  | 'qualifyLead'
  | 'changeNegotiationStage'
  | 'changeNegotiationStatus'
  | 'changeNegotiationTemperature'
  | 'archiveLead'
  | 'deleteNegotiation'
  | 'deleteLead'

type AutomationCondition = 'replied' | 'notReplied' | 'deadlineReached'

type AutomationWaitUnit = 'minutes' | 'hours' | 'days'

type AutomationFollowUpDraft = {
  title: string
  action: FollowUpActionDraft
  dueAt: string
}

type AutomationConditionItem = {
  id: string
  parentId: string | null
  type: 'condition'
  conditionType: AutomationCondition
  status?: FollowUpActionStatus
}

type AutomationActionItem = {
  id: string
  parentId: string | null
  type: 'action'
  actionType: AutomationAction
  value: string
  waitTime: number
  waitUnit: AutomationWaitUnit
  scheduledAt: string | null
  followUp: AutomationFollowUpDraft | null
  status?: FollowUpActionStatus
}

export type BusinessFollowUpAutomationItem =
  | AutomationConditionItem
  | AutomationActionItem

const automationActionTypeMap: Record<
  AutomationAction,
  FollowUpStepTreeActionType
> = {
  createFollowUp: 'create_follow_up',
  qualifyLead: 'qualify_lead',
  changeNegotiationStage: 'change_stage',
  changeNegotiationStatus: 'change_status',
  changeNegotiationTemperature: 'change_temperature',
  archiveLead: 'archive_lead',
  deleteNegotiation: 'delete_negotiation',
  deleteLead: 'delete_lead',
}

const automationConditionTypeMap: Record<
  AutomationCondition,
  FollowUpStepTreeConditionType
> = {
  replied: 'response_received',
  notReplied: 'no_response',
  deadlineReached: 'deadline_reached',
}

const automationActionTypeFromResponseMap: Partial<
  Record<string, AutomationAction>
> = {
  create_follow_up: 'createFollowUp',
  qualify_lead: 'qualifyLead',
  change_stage: 'changeNegotiationStage',
  change_status: 'changeNegotiationStatus',
  change_temperature: 'changeNegotiationTemperature',
  archive_lead: 'archiveLead',
  delete_negotiation: 'deleteNegotiation',
  delete_lead: 'deleteLead',
}

const automationConditionTypeFromResponseMap: Partial<
  Record<string, AutomationCondition>
> = {
  response_received: 'replied',
  no_response: 'notReplied',
  deadline_reached: 'deadlineReached',
}

const parseStepTimestamp = (value: string | undefined): number => {
  if (!value) {
    return Number.POSITIVE_INFINITY
  }

  const parsedTimestamp = Date.parse(value)
  return Number.isNaN(parsedTimestamp)
    ? Number.POSITIVE_INFINITY
    : parsedTimestamp
}

const resolveMessageActionType = (
  step: FollowUpActionResponse,
): FollowUpActionType | null => {
  if (step.actionType === 'send_message' || step.actionType === 'send_email') {
    return step.actionType
  }

  if (step.type === 'send_message' || step.type === 'send_email') {
    return step.type
  }

  return null
}

const getPayloadString = (
  payload: Record<string, unknown>,
  key: string,
): string => {
  const payloadValue = payload[key]
  return typeof payloadValue === 'string' ? payloadValue : ''
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const findPrimaryFollowUpActionStep = (
  steps: FollowUpActionResponse[],
): FollowUpActionResponse | null => {
  const candidates = steps
    .map((step, index) => ({
      step,
      index,
      actionType: resolveMessageActionType(step),
      createdAtTimestamp: parseStepTimestamp(step.createdAt),
      updatedAtTimestamp: parseStepTimestamp(step.updatedAt),
    }))
    .filter((item) => item.actionType !== null)

  if (!candidates.length) {
    return null
  }

  const rootCandidates = candidates.filter(
    (item) => item.step.parentId === null,
  )
  const scopedCandidates = rootCandidates.length ? rootCandidates : candidates

  const [oldestCandidate] = scopedCandidates.sort((firstItem, secondItem) => {
    if (firstItem.createdAtTimestamp !== secondItem.createdAtTimestamp) {
      return firstItem.createdAtTimestamp - secondItem.createdAtTimestamp
    }

    if (firstItem.updatedAtTimestamp !== secondItem.updatedAtTimestamp) {
      return firstItem.updatedAtTimestamp - secondItem.updatedAtTimestamp
    }

    return firstItem.index - secondItem.index
  })

  return oldestCandidate?.step ?? null
}

export const toBusinessFollowUpAutomationsFromResponseSteps = (
  steps: FollowUpActionResponse[],
): BusinessFollowUpAutomationItem[] => {
  const primaryStep = findPrimaryFollowUpActionStep(steps)
  const normalizeParentId = (parentId: string | null): string | null =>
    parentId === primaryStep?.id ? null : parentId

  return steps.flatMap<BusinessFollowUpAutomationItem>((step) => {
    if (primaryStep?.id === step.id) {
      return []
    }

    const mappedConditionType = step.conditionType
      ? automationConditionTypeFromResponseMap[step.conditionType]
      : undefined

    if (step.type === 'condition' || mappedConditionType) {
      if (!mappedConditionType) {
        return []
      }

      return [
        {
          id: step.id,
          parentId: normalizeParentId(step.parentId),
          type: 'condition',
          conditionType: mappedConditionType,
          status: step.status,
        } satisfies AutomationConditionItem,
      ]
    }

    const mappedActionType =
      automationActionTypeFromResponseMap[step.type] ??
      (step.actionType
        ? automationActionTypeFromResponseMap[step.actionType]
        : undefined)

    if (!mappedActionType) {
      return []
    }

    const payload = step.payload ?? {}
    const actionValue =
      mappedActionType === 'qualifyLead'
        ? getPayloadString(payload, 'qualification')
        : mappedActionType === 'changeNegotiationStage'
          ? getPayloadString(payload, 'stage')
          : mappedActionType === 'changeNegotiationStatus'
            ? getPayloadString(payload, 'status')
            : mappedActionType === 'changeNegotiationTemperature'
              ? getPayloadString(payload, 'temperature')
              : ''

    const nestedFollowUpPayload =
      mappedActionType === 'createFollowUp' && isRecord(payload.action)
        ? payload.action
        : null
    const nestedActionPayload =
      nestedFollowUpPayload && isRecord(nestedFollowUpPayload.payload)
        ? nestedFollowUpPayload.payload
        : {}

    const followUp =
      mappedActionType === 'createFollowUp' && nestedFollowUpPayload
        ? {
            title: getPayloadString(payload, 'title'),
            dueAt: getPayloadString(payload, 'dueAt'),
            action: fromFollowUpActionPayload({
              type: 'action',
              actionType:
                nestedFollowUpPayload.actionType === 'send_message' ||
                nestedFollowUpPayload.actionType === 'send_email'
                  ? nestedFollowUpPayload.actionType
                  : undefined,
              channel:
                nestedFollowUpPayload.channel === 'whatsapp' ||
                nestedFollowUpPayload.channel === 'messenger' ||
                nestedFollowUpPayload.channel === 'instagram' ||
                nestedFollowUpPayload.channel === 'Agenda'
                  ? nestedFollowUpPayload.channel
                  : undefined,
              payload: nestedActionPayload,
            }),
          }
        : null

    return [
      {
        id: step.id,
        parentId: normalizeParentId(step.parentId),
        type: 'action',
        actionType: mappedActionType,
        value: actionValue,
        waitTime: typeof step.waitTime === 'number' ? step.waitTime : 0,
        waitUnit:
          step.waitUnit === 'minutes' ||
          step.waitUnit === 'hours' ||
          step.waitUnit === 'days'
            ? step.waitUnit
            : 'minutes',
        scheduledAt: getPayloadString(payload, 'scheduledAt') || null,
        followUp,
        status: step.status,
      } satisfies AutomationActionItem,
    ]
  })
}

export const toBusinessFollowUpAutomationStepPayload = (
  automation: BusinessFollowUpAutomationItem,
): CreateFollowUpStepTreeItemPayload => {
  if (automation.type === 'condition') {
    return {
      clientId: automation.id,
      parentClientId: automation.parentId,
      type: 'condition',
      conditionType: automationConditionTypeMap[automation.conditionType],
    }
  }

  const payload: Record<string, unknown> =
    automation.actionType === 'createFollowUp' && automation.followUp
      ? {
          title: automation.followUp.title,
          dueAt: automation.followUp.dueAt,
          action: toFollowUpActionPayload(automation.followUp.action),
        }
      : automation.actionType === 'qualifyLead'
        ? { qualification: automation.value }
        : automation.actionType === 'changeNegotiationStage'
          ? { stage: automation.value }
          : automation.actionType === 'changeNegotiationStatus'
            ? { status: automation.value }
            : automation.actionType === 'changeNegotiationTemperature'
              ? { temperature: automation.value }
              : {}

  return {
    clientId: automation.id,
    parentClientId: automation.parentId,
    type: 'action',
    actionType: automationActionTypeMap[automation.actionType],
    waitTime: automation.waitTime,
    waitUnit: automation.waitUnit,
    payload,
  }
}
