import { useEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  Edit3,
  MoreVertical,
  Paperclip,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  Phone,
  Pin,
  PinOff,
  Reply,
  Search,
  Send,
  Smile,
  Trash2,
  UsersRound,
  Video,
  Wand2,
  X
} from "lucide-react";
import EditGroupDialog from "./EditGroupDialog";
import ProfileAvatar from "./ProfileAvatar";
import { parseTaskIntent } from "../taskParser";

function formatMessageTime(dateValue) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(dateValue));
}

function truncateText(value, length = 82) {
  const text = String(value || "");
  return text.length > length ? `${text.slice(0, length)}...` : text;
}

function normalizeMention(value) {
  return String(value || "").toLowerCase();
}

function isAllMention(value) {
  const mention = normalizeMention(value);
  return mention === "all" || mention === "everyone";
}

function getActiveMention(value, cursor) {
  if (cursor === null || cursor === undefined) return null;

  const textBeforeCursor = value.slice(0, cursor);
  const mentionStart = textBeforeCursor.lastIndexOf("@");

  if (mentionStart === -1) return null;

  const charBeforeMention = value[mentionStart - 1];
  const query = textBeforeCursor.slice(mentionStart + 1);

  if (charBeforeMention && !/\s/.test(charBeforeMention)) return null;
  if (!/^[a-z0-9_-]*$/i.test(query)) return null;

  return {
    start: mentionStart,
    end: cursor,
    query
  };
}

function getMessageMentionState(message, members) {
  const memberKeys = new Set(members.map((member) => normalizeMention(member)));
  const mentionedKeys = new Set((message.mentions || []).map((mention) => normalizeMention(mention)));
  let mentionsAll = Boolean(message.mentionsAll);

  for (const match of String(message.content || "").matchAll(/@([a-z0-9_-]+)/gi)) {
    const mentionKey = normalizeMention(match[1]);

    if (isAllMention(mentionKey)) {
      mentionsAll = true;
      continue;
    }

    if (memberKeys.has(mentionKey)) {
      mentionedKeys.add(mentionKey);
    }
  }

  return {
    mentionsAll,
    mentionedKeys
  };
}

function renderMessageContent(content, members, username) {
  const text = String(content || "");
  const memberKeys = new Set(members.map((member) => normalizeMention(member)));
  const currentUserKey = normalizeMention(username);
  const mentionPattern = /@([a-z0-9_-]+)/gi;
  const nodes = [];
  let lastIndex = 0;

  for (const match of text.matchAll(mentionPattern)) {
    const mentionText = match[0];
    const mentionKey = normalizeMention(match[1]);
    const isKnownMention = isAllMention(mentionKey) || memberKeys.has(mentionKey);
    const isForCurrentUser = isAllMention(mentionKey) || mentionKey === currentUserKey;

    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    nodes.push(
      <span
        className={[
          "message-mention",
          isKnownMention ? "known" : "",
          isForCurrentUser ? "for-current-user" : ""
        ]
          .filter(Boolean)
          .join(" ")}
        key={`${mentionText}-${match.index}`}
      >
        {mentionText}
      </span>
    );

    lastIndex = match.index + mentionText.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : text;
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  textArea.remove();
}

export default function ChatPanel({
  team,
  messages,
  teamId,
  user,
  members = [],
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onPinMessage,
  onUnpinMessage,
  onConvertToTask,
  taskSourceMessageIds = new Set(),
  isTasksCollapsed = false,
  onToggleTasksPanel,
  onUpdateGroup
}) {
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [replyTarget, setReplyTarget] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [isPinnedOpen, setIsPinnedOpen] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [mentionMenu, setMentionMenu] = useState(null);
  const [isChatMenuOpen, setIsChatMenuOpen] = useState(false);
  const [isEditGroupOpen, setIsEditGroupOpen] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const messageRefs = useRef(new Map());
  const copiedTimeoutRef = useRef(null);
  const highlightTimeoutRef = useRef(null);
  const messagesById = useMemo(() => new Map(messages.map((message) => [message.id, message])), [messages]);
  const taskIntentByMessageId = useMemo(() => {
    return new Map(
      messages.map((message) => [
        message.id,
        parseTaskIntent(message.content, {
          members,
          fallbackAssignee: user.username,
          baseDate: message.createdAt
        })
      ])
    );
  }, [members, messages, user.username]);
  const pinnedMessages = useMemo(() => {
    return messages
      .filter((message) => message.isPinned)
      .sort((first, second) => {
        const firstDate = new Date(first.pinnedAt || first.createdAt).getTime();
        const secondDate = new Date(second.pinnedAt || second.createdAt).getTime();
        return secondDate - firstDate;
      });
  }, [messages]);
  const mentionOptions = useMemo(() => {
    const query = normalizeMention(mentionMenu?.query || "");
    const allOptions = [
      {
        id: "all",
        value: "all",
        label: "@all",
        description: "Everyone in this group",
        kind: "all"
      },
      ...members.map((member) => ({
        id: member,
        value: member,
        label: `@${member}`,
        description: "Group member",
        kind: "member"
      }))
    ];

    return allOptions.filter((option) => normalizeMention(option.value).startsWith(query));
  }, [members, mentionMenu?.query]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [messages.length]);

  useEffect(() => {
    return () => {
      window.clearTimeout(copiedTimeoutRef.current);
      window.clearTimeout(highlightTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    setDraft("");
    setReplyTarget(null);
    setEditingMessage(null);
    setOpenMenuId(null);
    setIsPinnedOpen(false);
    setMentionMenu(null);
    setIsChatMenuOpen(false);
    setIsEditGroupOpen(false);
  }, [teamId]);

  useEffect(() => {
    if (replyTarget && !messagesById.has(replyTarget.id)) {
      setReplyTarget(null);
    }

    if (editingMessage && !messagesById.has(editingMessage.id)) {
      setEditingMessage(null);
      setDraft("");
    }
  }, [editingMessage, messagesById, replyTarget]);

  const setMessageRef = (messageId) => (node) => {
    if (node) {
      messageRefs.current.set(messageId, node);
      return;
    }

    messageRefs.current.delete(messageId);
  };

  const focusComposer = () => {
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const updateMentionMenu = (value, cursor) => {
    const nextMention = getActiveMention(value, cursor);

    setMentionMenu((currentMenu) => {
      if (!nextMention) return null;

      return {
        ...nextMention,
        activeIndex:
          currentMenu?.query === nextMention.query
            ? Math.min(currentMenu.activeIndex, Math.max(mentionOptions.length - 1, 0))
            : 0
      };
    });
  };

  const scrollToMessage = (messageId) => {
    const messageNode = messageRefs.current.get(messageId);

    if (!messageNode) return;

    setIsPinnedOpen(false);
    messageNode.scrollIntoView({ block: "center", behavior: "smooth" });
    setHighlightedMessageId(messageId);

    window.clearTimeout(highlightTimeoutRef.current);
    highlightTimeoutRef.current = window.setTimeout(() => {
      setHighlightedMessageId(null);
    }, 1700);
  };

  const startReply = (message) => {
    setEditingMessage(null);
    setReplyTarget(message);
    setOpenMenuId(null);
    focusComposer();
  };

  const startEdit = (message) => {
    setReplyTarget(null);
    setEditingMessage(message);
    setDraft(message.content);
    setOpenMenuId(null);
    focusComposer();
  };

  const cancelComposeContext = () => {
    setReplyTarget(null);
    setEditingMessage(null);
    setDraft("");
    setMentionMenu(null);
  };

  const handleCopyMessage = async (message) => {
    await copyText(message.content);
    setCopiedMessageId(message.id);
    setOpenMenuId(null);

    window.clearTimeout(copiedTimeoutRef.current);
    copiedTimeoutRef.current = window.setTimeout(() => {
      setCopiedMessageId(null);
    }, 1500);
  };

  const handleDeleteMessage = async (message) => {
    const shouldDelete = window.confirm("Delete this message?");

    if (!shouldDelete) return;

    await onDeleteMessage(message.id);
    setOpenMenuId(null);

    if (editingMessage?.id === message.id) {
      cancelComposeContext();
    }
  };

  const handleTogglePin = async (message) => {
    if (message.isPinned) {
      await onUnpinMessage(message.id);
    } else {
      await onPinMessage(message.id);
    }

    setOpenMenuId(null);
  };

  const handleDraftChange = (event) => {
    setDraft(event.target.value);
    updateMentionMenu(event.target.value, event.target.selectionStart);
  };

  const handleComposerCursorChange = (event) => {
    updateMentionMenu(event.target.value, event.target.selectionStart);
  };

  const handleComposerKeyUp = (event) => {
    if (["ArrowDown", "ArrowUp", "Enter", "Tab", "Escape"].includes(event.key)) {
      return;
    }

    handleComposerCursorChange(event);
  };

  const selectMention = (option) => {
    if (!mentionMenu) return;

    const insertion = `@${option.value} `;
    const nextDraft = `${draft.slice(0, mentionMenu.start)}${insertion}${draft.slice(mentionMenu.end)}`;
    const cursor = mentionMenu.start + insertion.length;

    setDraft(nextDraft);
    setMentionMenu(null);

    window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(cursor, cursor);
    }, 0);
  };

  const handleComposerKeyDown = (event) => {
    if (!mentionMenu || mentionOptions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setMentionMenu((currentMenu) =>
        currentMenu
          ? {
              ...currentMenu,
              activeIndex: (currentMenu.activeIndex + 1) % mentionOptions.length
            }
          : currentMenu
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setMentionMenu((currentMenu) =>
        currentMenu
          ? {
              ...currentMenu,
              activeIndex: (currentMenu.activeIndex - 1 + mentionOptions.length) % mentionOptions.length
            }
          : currentMenu
      );
      return;
    }

    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      selectMention(mentionOptions[mentionMenu.activeIndex] || mentionOptions[0]);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setMentionMenu(null);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const content = draft.trim();

    if (!content) return;

    setIsSending(true);

    try {
      if (editingMessage) {
        await onEditMessage(editingMessage.id, content);
        setEditingMessage(null);
      } else {
        await onSendMessage({
          teamId,
          sender: user.username,
          content,
          replyToId: replyTarget?.id ?? null
        });
        setReplyTarget(null);
      }

      setDraft("");
    } finally {
      setIsSending(false);
    }
  };

  const renderActionMenu = (message, isMine) => {
    const actions = [
      { id: "reply", label: "Reply", icon: Reply, onSelect: () => startReply(message) },
      ...(isMine
        ? [
            { id: "edit", label: "Edit", icon: Pencil, onSelect: () => startEdit(message) },
            { id: "delete", label: "Delete", icon: Trash2, onSelect: () => handleDeleteMessage(message) }
          ]
        : []),
      {
        id: "copy",
        label: copiedMessageId === message.id ? "Copied" : "Copy",
        icon: Copy,
        onSelect: () => handleCopyMessage(message)
      },
      {
        id: "pin",
        label: message.isPinned ? "Unpin" : "Pin",
        icon: message.isPinned ? PinOff : Pin,
        onSelect: () => handleTogglePin(message)
      }
    ];

    return (
      <div className="message-action-menu" role="menu">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <button type="button" key={action.id} onClick={action.onSelect} role="menuitem">
              <Icon size={15} />
              {action.label}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <section className="chat-panel">
      <div className="chat-header">
        <div className="chat-title-block">
          <span className="chat-group-icon" style={{ backgroundColor: team?.color || "#7c3aed" }}>
            {team?.avatarUrl ? <img src={team.avatarUrl} alt="" /> : <UsersRound size={22} />}
          </span>
          <div>
            <h2>{team?.name || "Group Chat"}</h2>
            <span>{members.length} members</span>
          </div>
        </div>
        <div className="panel-header-actions">
          <button type="button" className="chat-header-icon-button" title="Search messages">
            <Search size={20} />
          </button>
          <button type="button" className="chat-header-icon-button" title="Start voice call">
            <Phone size={19} />
          </button>
          <button type="button" className="chat-header-icon-button" title="Start video call">
            <Video size={20} />
          </button>
          <button
            type="button"
            className="pin-tray-button"
            onClick={() => setIsPinnedOpen((isOpen) => !isOpen)}
            aria-expanded={isPinnedOpen}
            aria-controls="pinned-message-tray"
            title="Pinned messages"
          >
            <Pin size={18} />
            <span>{pinnedMessages.length}</span>
          </button>
          <div className="chat-options-wrap">
            <button
              type="button"
              className="chat-header-icon-button"
              title="More chat options"
              onClick={() => setIsChatMenuOpen((isOpen) => !isOpen)}
              aria-expanded={isChatMenuOpen}
            >
              <MoreVertical size={20} />
            </button>
            {isChatMenuOpen && (
              <div className="chat-options-menu" role="menu">
                <button
                  type="button"
                  onClick={() => {
                    setIsChatMenuOpen(false);
                    setIsEditGroupOpen(true);
                  }}
                  role="menuitem"
                >
                  <Edit3 size={15} />
                  Edit group
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            className="chat-header-icon-button task-pane-chat-toggle"
            onClick={onToggleTasksPanel}
            title={isTasksCollapsed ? "Show tasks" : "Collapse tasks"}
            aria-label={isTasksCollapsed ? "Show tasks panel" : "Collapse tasks panel"}
          >
            {isTasksCollapsed ? <PanelRightOpen size={19} /> : <PanelRightClose size={19} />}
          </button>
        </div>
      </div>

      {isEditGroupOpen && (
        <EditGroupDialog
          team={team}
          onClose={() => setIsEditGroupOpen(false)}
          onUpdate={onUpdateGroup}
        />
      )}

      {isPinnedOpen && (
        <div className="pinned-message-tray" id="pinned-message-tray">
          <div className="pinned-tray-header">
            <div>
              <p className="eyebrow">Pinned</p>
              <h3>Pinned Messages</h3>
            </div>
            <button type="button" className="tray-close-button" onClick={() => setIsPinnedOpen(false)} title="Close">
              <X size={17} />
            </button>
          </div>

          {pinnedMessages.length > 0 ? (
            <div className="pinned-message-list">
              {pinnedMessages.map((message) => (
                <article className="pinned-message-item" key={message.id}>
                  <button type="button" className="pinned-message-open" onClick={() => scrollToMessage(message.id)}>
                    <strong>{message.sender}</strong>
                    <span>{formatMessageTime(message.createdAt)}</span>
                    <p>{truncateText(message.content, 96)}</p>
                  </button>
                  <button
                    type="button"
                    className="pinned-message-remove"
                    onClick={() => onUnpinMessage(message.id)}
                    title="Remove pin"
                  >
                    <PinOff size={16} />
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-pins">No pinned messages yet.</div>
          )}
        </div>
      )}

      <div className="chat-list" ref={scrollRef} onClick={() => setOpenMenuId(null)}>
        <div className="message-date-divider">
          <span>Today</span>
        </div>
        {messages.map((message) => {
          const isMine = message.sender === user.username;
          const repliedMessage = message.replyToId ? messagesById.get(message.replyToId) : null;
          const taskIntent = taskIntentByMessageId.get(message.id);
          const isTaskAdded = taskSourceMessageIds.has(message.id);
          const mentionState = getMessageMentionState(message, members);
          const isMentioned =
            !isMine &&
            (mentionState.mentionsAll || mentionState.mentionedKeys.has(normalizeMention(user.username)));
          const rowClassName = [
            "message-row",
            isMine ? "mine" : "",
            isMentioned ? "mentioned" : "",
            highlightedMessageId === message.id ? "highlighted" : ""
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <div className={rowClassName} key={message.id} ref={setMessageRef(message.id)}>
              <ProfileAvatar name={message.sender} size="lg" className="message-avatar" />
              <article className={isMine ? "message-bubble mine" : "message-bubble"}>
                <div className="message-meta">
                  <div className="message-author">
                    <strong>{message.sender}</strong>
                    {message.editedAt && <em>edited</em>}
                  </div>
                  <div className="message-meta-actions">
                    {message.isPinned && <Pin size={13} />}
                    {isMentioned && <span className="message-mentioned-badge">Mentioned you</span>}
                    <span>{formatMessageTime(message.createdAt)}</span>
                    <button
                      type="button"
                      className="message-more-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpenMenuId((currentId) => (currentId === message.id ? null : message.id));
                      }}
                      aria-expanded={openMenuId === message.id}
                      title="Message actions"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {openMenuId === message.id && renderActionMenu(message, isMine)}
                  </div>
                </div>
                {message.replyToId && (
                  <button
                    type="button"
                    className="reply-reference"
                    onClick={() => repliedMessage && scrollToMessage(message.replyToId)}
                    disabled={!repliedMessage}
                  >
                    <Reply size={14} />
                    <span>
                      {repliedMessage
                        ? `${repliedMessage.sender}: ${truncateText(repliedMessage.content, 68)}`
                        : "Original message unavailable"}
                    </span>
                  </button>
                )}
                <p className="message-text">{renderMessageContent(message.content, members, user.username)}</p>
                {taskIntent && (
                  <button
                    type="button"
                    className="ghost-button compact-button"
                    onClick={() => onConvertToTask(message, taskIntent)}
                    title={
                      isTaskAdded
                        ? "This message is already a task"
                        : `Add task due ${taskIntent.deadline}`
                    }
                    disabled={isTaskAdded}
                  >
                    <Wand2 size={15} />
                    {isTaskAdded ? "Task Added" : "Add Task"}
                  </button>
                )}
              </article>
            </div>
          );
        })}
      </div>

      <div className="chat-composer">
        {(replyTarget || editingMessage) && (
          <div className="compose-context">
            <Reply size={16} />
            <div>
              <strong>{editingMessage ? "Editing message" : `Replying to ${replyTarget.sender}`}</strong>
              <span>{truncateText(editingMessage?.content || replyTarget?.content, 92)}</span>
            </div>
            <button type="button" onClick={cancelComposeContext} title="Cancel">
              <X size={16} />
            </button>
          </div>
        )}

        {mentionMenu && mentionOptions.length > 0 && (
          <div className="mention-menu" role="listbox">
            {mentionOptions.map((option, index) => (
              <button
                type="button"
                className={index === mentionMenu.activeIndex ? "mention-option active" : "mention-option"}
                key={option.id}
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectMention(option);
                }}
                role="option"
                aria-selected={index === mentionMenu.activeIndex}
              >
                {option.kind === "all" ? (
                  <span className="mention-all-icon">
                    <UsersRound size={16} />
                  </span>
                ) : (
                  <ProfileAvatar name={option.value} size="xs" />
                )}
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </span>
              </button>
            ))}
          </div>
        )}

        <form className="chat-form" onSubmit={handleSubmit}>
          <button type="button" className="composer-icon-button" title="Attach file">
            <Paperclip size={20} />
          </button>
          <input
            ref={inputRef}
            value={draft}
            onChange={handleDraftChange}
            onClick={handleComposerCursorChange}
            onKeyUp={handleComposerKeyUp}
            onKeyDown={handleComposerKeyDown}
            placeholder={editingMessage ? "Edit your message..." : "Write a message to your group..."}
          />
          <button type="button" className="composer-icon-button" title="Add reaction">
            <Smile size={20} />
          </button>
          <button type="submit" className="icon-button" disabled={isSending} title="Send message">
            <Send size={18} />
          </button>
        </form>
      </div>
    </section>
  );
}
