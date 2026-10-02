import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Activity, ChevronRight, Server } from 'lucide-react';
import type { Node } from '@/lib/api';
import type { LoadAlert } from '@/lib/loadAlerts';
import { liveMetrics } from '@/lib/freshness';
import { bytes } from '@/lib/format';
import { tr } from '@/lib/i18n';
import { Flag } from './NodeIcons';
import { LoadRecords } from './LoadAlertTile';

export interface CockpitLiveLeaderboardProps {
  nodes: Node[];
  onSelectNode?: (id: number) => void;
}

export function CockpitLiveLeaderboard({ nodes, onSelectNode }: CockpitLiveLeaderboardProps) {
  const rankedNodes = useMemo(() => {
    return nodes
      .filter((n) => {
        if (!n.online) return false;
        const m = liveMetrics(n);
        if (!m) return false;
        const rx = m.net_rx ?? 0;
        const tx = m.net_tx ?? 0;
        return rx + tx > 0;
      })
      .map((n) => {
        const m = liveMetrics(n)!;
        const rx = m.net_rx ?? 0;
        const tx = m.net_tx ?? 0;
        return {
          node: n,
          rx,
          tx,
          total: rx + tx,
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [nodes]);

  const handleClick = (id: number) => {
    if (onSelectNode) {
      onSelectNode(id);
    } else {
      const el = document.querySelector(`[data-node-id="${id}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const card = el.closest('.node-card, tr') || el;
        card.classList.add('node-card-highlight');
        setTimeout(() => card.classList.remove('node-card-highlight'), 2000);
      }
    }
  };

  return (
    <div className="cockpit-widget cockpit-leaderboard">
      <div className="cockpit-widget-header">
        <div className="cockpit-widget-title">
          <Activity size={14} className="cockpit-widget-icon" aria-hidden="true" />
          <h3>{tr('实时流量排行')}</h3>
        </div>
        <span className="cockpit-widget-tag">{tr('Top 5 实时吞吐')}</span>
      </div>
      {rankedNodes.length === 0 ? (
        <div className="cockpit-widget-empty" role="status">
          <p>{tr('暂无实时网络吞吐数据')}</p>
        </div>
      ) : (
        <div className="cockpit-leaderboard-list" role="list">
          {rankedNodes.map((item, index) => (
            <button
              key={item.node.id}
              type="button"
              role="listitem"
              className="cockpit-leaderboard-item"
              onClick={() => handleClick(item.node.id)}
              aria-label={tr('查看 {0}', item.node.name)}
              title={tr('查看 {0}', item.node.name)}
            >
              <span className="leaderboard-rank" data-rank={index + 1}>
                {index + 1}
              </span>
              <div className="leaderboard-flag">
                {item.node.country ? (
                  <Flag code={item.node.country} key={item.node.country} />
                ) : (
                  <Server size={14} aria-hidden="true" />
                )}
              </div>
              <span className="leaderboard-name">{item.node.name}</span>
              <div className="leaderboard-badge">
                <span className="throughput-down" title={tr('下载')}>
                  <ArrowDown size={11} aria-hidden="true" />
                  <span>{bytes(item.rx)}/s</span>
                </span>
                <span className="throughput-up" title={tr('上传')}>
                  <ArrowUp size={11} aria-hidden="true" />
                  <span>{bytes(item.tx)}/s</span>
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export interface CockpitStatusCardProps {
  nodes: Node[];
  loadAlerts?: { events: LoadAlert[]; saved: boolean } | LoadAlert[];
  onAlert?: (event: LoadAlert) => void;
  onViewAlerts?: () => void;
}

export function CockpitStatusCard({
  nodes,
  loadAlerts,
  onAlert,
  onViewAlerts,
}: CockpitStatusCardProps) {
  const [recordsOpen, setRecordsOpen] = useState(false);
  const events = Array.isArray(loadAlerts)
    ? loadAlerts
    : (loadAlerts?.events ?? []);
  const activeAlerts = events.filter((e) => (e.status ? e.status === 'active' : true));
  const alertCount = activeAlerts.length;

  const handleOpenAlerts = () => {
    if (onViewAlerts) {
      onViewAlerts();
    } else {
      setRecordsOpen(true);
    }
  };

  const onlineCount = nodes.filter((n) => n.online).length;
  const totalCount = nodes.length;

  return (
    <div className="cockpit-widget cockpit-status-card" data-has-alerts={alertCount > 0}>
      {alertCount > 0 ? (
        <button
          type="button"
          className="cockpit-status-badge is-warning"
          onClick={handleOpenAlerts}
          aria-label={tr('查看高负载记录详情')}
          title={tr('查看高负载记录详情')}
        >
          <span className="status-pulse-indicator is-warning" aria-hidden="true">
            <span className="status-pulse-dot" />
            <span className="status-pulse-ring" />
          </span>
          <span className="status-text">
            <b>{alertCount}</b> {tr('项告警进行中')}
          </span>
          <span className="status-action">
            <span>{tr('点击查看')}</span>
            <ChevronRight size={13} aria-hidden="true" />
          </span>
        </button>
      ) : (
        <div className="cockpit-status-badge is-healthy" role="status">
          <span className="status-pulse-indicator is-healthy" aria-hidden="true">
            <span className="status-pulse-dot" />
            <span className="status-pulse-ring" />
          </span>
          <span className="status-text">
            {tr('全系统健康运转中')} · {onlineCount}/{totalCount} {tr('正常')}
          </span>
        </div>
      )}
      {recordsOpen && (
        <LoadRecords
          events={events}
          saved={typeof loadAlerts === 'object' && 'saved' in loadAlerts ? loadAlerts.saved : true}
          available={nodes.map((n) => n.id)}
          onOpen={(event) => {
            setRecordsOpen(false);
            onAlert?.(event);
          }}
          onClose={() => setRecordsOpen(false)}
        />
      )}
    </div>
  );
}
