import { NextRequest, NextResponse } from "next/server";
import { sendEmails } from "@/scripts/sendEmails";
import { generateProspects } from "@/scripts/generateProspects";
import { buildHistoryEntry, loadCrmState, saveCrmState } from "@/utils/crm";

type ActionPayload = {
  action: string;
  ids?: string[];
};

function transitionRecords(
  records: any[],
  history: any[],
  ids: string[],
  nextStatus: string,
  action: string,
  note: string
) {
  const idSet = new Set(ids);
  const nextHistory = [...history];
  const nextRecords = records.map((record) => {
    if (!idSet.has(record.id)) {
      return record;
    }

    const updated = {
      ...record,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
      sentAt:
        nextStatus === "contacted" || nextStatus === "closed"
          ? record.sentAt || new Date().toISOString()
          : record.sentAt,
      lastError: nextStatus === "deleted" ? record.lastError : "",
    };

    nextHistory.push(
      buildHistoryEntry(updated, action, {
        fromStatus: record.status,
        toStatus: nextStatus,
        note,
        meta: {
          source: updated.source,
          city: updated.city,
          email: updated.email,
          phone: updated.phone,
          category: updated.category,
          createdAt: updated.createdAt,
        },
      })
    );

    return updated;
  });

  return { records: nextRecords, history: nextHistory };
}

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as ActionPayload;
  const ids = Array.isArray(payload.ids) ? payload.ids : [];

  try {
    if (payload.action === "generate") {
      const result = await generateProspects();
      return NextResponse.json({ ok: true, result });
    }

    if (payload.action === "sendAllProspects") {
      const result = await sendEmails();
      return NextResponse.json({ ok: true, result });
    }

    if (payload.action === "approveAllGenerated") {
      const state = loadCrmState();
      const generatedIds = state.generated.map((record: { id: string }) => record.id);

      if (!generatedIds.length) {
        return NextResponse.json(
          { error: "No hay registros en Generated para mover." },
          { status: 400 }
        );
      }

      const nextState = transitionRecords(
        state.records,
        state.history,
        generatedIds,
        "prospect",
        "moved_to_prospect",
        "All generated records moved to active prospects"
      );

      saveCrmState(nextState.records, nextState.history);
      return NextResponse.json({ ok: true, moved: generatedIds.length });
    }

    if (!ids.length) {
      return NextResponse.json(
        { error: "Selecciona al menos un registro." },
        { status: 400 }
      );
    }

    if (payload.action === "sendEmails") {
      const result = await sendEmails({ recordIds: ids });
      return NextResponse.json({ ok: true, result });
    }

    const state = loadCrmState();
    let nextState = {
      records: state.records,
      history: state.history,
    };

    switch (payload.action) {
      case "approveGenerated":
      case "moveToProspects":
      case "restoreFailed":
        nextState = transitionRecords(
          state.records,
          state.history,
          ids,
          "prospect",
          "moved_to_prospect",
          "Record moved to active prospects"
        );
        break;
      case "markContacted":
        nextState = transitionRecords(
          state.records,
          state.history,
          ids,
          "contacted",
          "marked_contacted",
          "Record marked as contacted manually"
        );
        break;
      case "markAsClient":
        nextState = transitionRecords(
          state.records,
          state.history,
          ids,
          "closed",
          "marked_client",
          "Record marked as client and excluded from auto-fail"
        );
        break;
      case "archiveRecords":
        nextState = transitionRecords(
          state.records,
          state.history,
          ids,
          "archived",
          "archived",
          "Record archived from CRM view"
        );
        break;
      case "deleteRecords":
        nextState = transitionRecords(
          state.records,
          state.history,
          ids,
          "deleted",
          "deleted",
          "Record deleted from active flow"
        );
        break;
      default:
        return NextResponse.json({ error: "Accion no soportada." }, { status: 400 });
    }

    saveCrmState(nextState.records, nextState.history);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo completar la accion.",
      },
      { status: 500 }
    );
  }
}
