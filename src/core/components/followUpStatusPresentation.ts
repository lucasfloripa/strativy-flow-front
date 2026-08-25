import type {
  FollowUpActionResponse,
  LeadFollowUpStatus
} from '../../features/webhook/types/webhook.types'

export type FollowUpStatusPresentation = {
  label: string
  textColor: string
  background: string
}

export const getFollowUpStatusPresentation = (
  status: LeadFollowUpStatus,
  actions: FollowUpActionResponse[] = [],
  isOverdue = false
): FollowUpStatusPresentation => {
  if (actions.some((action) => action.status === 'manual_required')) {
    return {
      label: 'Ação manual',
      textColor: '#9a3412',
      background: '#ffedd5'
    }
  }

  if (actions.some((action) => action.status === 'failed')) {
    return {
      label: 'Falha no envio',
      textColor: '#b91c1c',
      background: '#fee2e2'
    }
  }

  if (status === 'done') {
    return {
      label: 'Concluído',
      textColor: '#166534',
      background: '#dcfce7'
    }
  }

  if (status === 'canceled') {
    return {
      label: 'Cancelado',
      textColor: '#b91c1c',
      background: '#fee2e2'
    }
  }

  if (status === 'skipped') {
    return {
      label: 'Ignorado',
      textColor: '#7c2d12',
      background: '#ffedd5'
    }
  }

  if (status === 'pending' && isOverdue) {
    return {
      label: 'Pendente',
      textColor: '#b91c1c',
      background: '#fee2e2'
    }
  }

  return {
    label: 'Pendente',
    textColor: '#1d4ed8',
    background: '#dbeafe'
  }
}
