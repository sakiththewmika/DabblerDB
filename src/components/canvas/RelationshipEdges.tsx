import React, { useMemo } from 'react';
import type { SchemaTable, ModuleGroup } from '../../types/schema';
import { useSchemaStore } from '../../store/useSchemaStore';

interface RelationshipEdgesProps {
  tables: SchemaTable[];
  modules: ModuleGroup[];
  selectedTableId: string | null;
}

interface EdgePathData {
  id: string;
  sourceTableId: string;
  targetTableId: string;
  sourceColName: string;
  targetColName?: string;
  d: string;
  sourceAnchor: { x: number; y: number };
  targetAnchor: { x: number; y: number };
  color: string;
  isSelf: boolean;
  isSelected: boolean;
  isDimmed: boolean;
}

const TABLE_WIDTH = 288; // matches w-72 (18rem)

export const RelationshipEdges: React.FC<RelationshipEdgesProps> = ({
  tables,
  modules,
  selectedTableId,
}) => {
  const { connectingEdge } = useSchemaStore();

  const tableMap = useMemo(() => {
    return new Map<string, SchemaTable>(tables.map((t) => [t.id, t]));
  }, [tables]);

  const moduleColorMap = useMemo(() => {
    return new Map<string, string>(modules.map((m) => [m.id, m.color]));
  }, [modules]);

  const edges = useMemo(() => {
    const list: EdgePathData[] = [];

    tables.forEach((sourceTable) => {
      sourceTable.columns.forEach((sourceCol, colIndex) => {
        if (!sourceCol.fkTargetTableId) return;

        const targetTable = tableMap.get(sourceCol.fkTargetTableId);
        if (!targetTable) return;

        // Exact Row-Level Y Coordinate
        const sourceHeaderHeight = 44 + (sourceTable.comment ? 28 : 0) + 4;
        const sourceY = sourceTable.y + sourceHeaderHeight + colIndex * 29 + 14.5;

        // Target Row-Level Y Coordinate
        let targetColIndex = targetTable.columns.findIndex(
          (c) => c.id === sourceCol.fkTargetColumnId
        );
        if (targetColIndex === -1) {
          targetColIndex = targetTable.columns.findIndex((c) => c.isPk);
          if (targetColIndex === -1) targetColIndex = 0;
        }

        const targetHeaderHeight = 44 + (targetTable.comment ? 28 : 0) + 4;
        const targetY = targetTable.y + targetHeaderHeight + targetColIndex * 29 + 14.5;

        const isSelf = sourceTable.id === targetTable.id;
        const isSelected =
          selectedTableId === sourceTable.id || selectedTableId === targetTable.id;
        const isDimmed = !!selectedTableId && !isSelected;

        const targetModuleColor =
          moduleColorMap.get(targetTable.moduleId) || '#3b82f6';

        let pathString: string;
        let sAnchor: { x: number; y: number };
        let tAnchor: { x: number; y: number };

        if (isSelf) {
          // Self-referencing loop around table right side
          sAnchor = { x: sourceTable.x + TABLE_WIDTH, y: sourceY };
          tAnchor = { x: sourceTable.x + TABLE_WIDTH - 20, y: sourceTable.y };
          const loopOutX = sourceTable.x + TABLE_WIDTH + 45;
          pathString = `M ${sAnchor.x} ${sAnchor.y} C ${loopOutX} ${sAnchor.y}, ${loopOutX} ${sourceTable.y - 25}, ${tAnchor.x} ${sourceTable.y - 25} L ${tAnchor.x} ${tAnchor.y}`;
        } else {
          // Determine horizontal orientation
          const sourceRight = sourceTable.x + TABLE_WIDTH;
          const targetRight = targetTable.x + TABLE_WIDTH;

          if (targetTable.x >= sourceRight - 40) {
            // Target is to the right
            sAnchor = { x: sourceRight, y: sourceY };
            tAnchor = { x: targetTable.x, y: targetY };
            const dx = Math.max(40, (tAnchor.x - sAnchor.x) * 0.45);
            pathString = `M ${sAnchor.x} ${sAnchor.y} C ${sAnchor.x + dx} ${sAnchor.y}, ${tAnchor.x - dx} ${tAnchor.y}, ${tAnchor.x} ${tAnchor.y}`;
          } else if (targetRight <= sourceTable.x + 40) {
            // Target is to the left
            sAnchor = { x: sourceTable.x, y: sourceY };
            tAnchor = { x: targetRight, y: targetY };
            const dx = Math.max(40, (sAnchor.x - tAnchor.x) * 0.45);
            pathString = `M ${sAnchor.x} ${sAnchor.y} C ${sAnchor.x - dx} ${sAnchor.y}, ${tAnchor.x + dx} ${tAnchor.y}, ${tAnchor.x} ${tAnchor.y}`;
          } else {
            // Overlapping horizontally: route out through the right side of both
            sAnchor = { x: sourceRight, y: sourceY };
            tAnchor = { x: targetRight, y: targetY };
            const offsetOut = Math.max(sAnchor.x, tAnchor.x) + 50;
            pathString = `M ${sAnchor.x} ${sAnchor.y} C ${offsetOut} ${sAnchor.y}, ${offsetOut} ${tAnchor.y}, ${tAnchor.x} ${tAnchor.y}`;
          }
        }

        list.push({
          id: `edge_${sourceTable.id}_${sourceCol.id}_to_${targetTable.id}`,
          sourceTableId: sourceTable.id,
          targetTableId: targetTable.id,
          sourceColName: sourceCol.name,
          targetColName: targetTable.columns[targetColIndex]?.name,
          d: pathString,
          sourceAnchor: sAnchor,
          targetAnchor: tAnchor,
          color: targetModuleColor,
          isSelf,
          isSelected,
          isDimmed,
        });
      });
    });

    return list;
  }, [tables, tableMap, moduleColorMap, selectedTableId]);

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
      <defs>
        {/* Glow filter for selected active edges */}
        <filter id="edge-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#3b82f6" floodOpacity="0.5" />
        </filter>
      </defs>

      {/* Render Established Edges */}
      {edges.map((edge) => (
        <g key={edge.id} className="transition-opacity duration-200">
          {/* Wider transparent background stroke for hover/selection visual body */}
          {edge.isSelected && (
            <path
              d={edge.d}
              fill="none"
              stroke={edge.color}
              strokeWidth="6"
              strokeOpacity="0.25"
              strokeLinecap="round"
            />
          )}

          {/* Main relationship curve */}
          <path
            d={edge.d}
            fill="none"
            stroke={edge.color}
            strokeWidth={edge.isSelected ? '2.5' : '1.75'}
            strokeOpacity={edge.isDimmed ? 0.15 : edge.isSelected ? 1 : 0.65}
            strokeDasharray={edge.isSelected ? '6 4' : undefined}
            className={edge.isSelected ? 'animate-[dash_1s_linear_infinite]' : undefined}
            strokeLinecap="round"
            filter={edge.isSelected ? 'url(#edge-glow)' : undefined}
          />

          {/* Source Row Anchor Circle */}
          <circle
            cx={edge.sourceAnchor.x}
            cy={edge.sourceAnchor.y}
            r={edge.isSelected ? '3.5' : '2.5'}
            fill={edge.color}
            opacity={edge.isDimmed ? 0.2 : 0.9}
          />

          {/* Target Row Anchor Circle */}
          <circle
            cx={edge.targetAnchor.x}
            cy={edge.targetAnchor.y}
            r={edge.isSelected ? '4' : '3'}
            fill={edge.color}
            opacity={edge.isDimmed ? 0.2 : 1}
          />
        </g>
      ))}

      {/* Live Drag-to-Connect Preview Curve */}
      {connectingEdge && (
        <g>
          <path
            d={`M ${connectingEdge.sourceAnchor.x} ${connectingEdge.sourceAnchor.y} C ${
              connectingEdge.sourceAnchor.x +
              (connectingEdge.currentPoint.x - connectingEdge.sourceAnchor.x) * 0.45
            } ${connectingEdge.sourceAnchor.y}, ${
              connectingEdge.currentPoint.x -
              (connectingEdge.currentPoint.x - connectingEdge.sourceAnchor.x) * 0.45
            } ${connectingEdge.currentPoint.y}, ${connectingEdge.currentPoint.x} ${
              connectingEdge.currentPoint.y
            }`}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2.5"
            strokeDasharray="6 4"
            className="animate-[dash_0.8s_linear_infinite]"
          />
          <circle
            cx={connectingEdge.sourceAnchor.x}
            cy={connectingEdge.sourceAnchor.y}
            r="4"
            fill="#3b82f6"
          />
          <circle
            cx={connectingEdge.currentPoint.x}
            cy={connectingEdge.currentPoint.y}
            r="5"
            fill="#3b82f6"
            className="animate-ping opacity-75"
          />
          <circle
            cx={connectingEdge.currentPoint.x}
            cy={connectingEdge.currentPoint.y}
            r="4"
            fill="#3b82f6"
          />
        </g>
      )}

      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -20;
          }
        }
      `}</style>
    </svg>
  );
};
