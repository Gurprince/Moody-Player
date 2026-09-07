import React, { useRef, useState } from "react";
import { client, MOODS, readError } from "../api.js";
import "./UploadForm.css";

const EMPTY = { title: "", artist: "", mood: "happy" };

const UploadSong = ({ onUpload }) => {
  const formRef = useRef(null);
  const [form, setForm] = useState(EMPTY);
  const [files, setFiles] = useState({ audio: null, cover: null });
  const [status, setStatus] = useState(null); // { tone, text }
  const [sending, setSending] = useState(false);

  const handleChange = (e) => {
    const { name, value, files: picked } = e.target;
    if (picked) setFiles((prev) => ({ ...prev, [name]: picked[0] || null }));
    else setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setStatus(null);

    const data = new FormData();
    data.append("title", form.title);
    data.append("artist", form.artist);
    data.append("mood", form.mood);
    if (files.audio) data.append("audio", files.audio);
    if (files.cover) data.append("cover", files.cover);

    try {
      const { data: result } = await client.post("/songs", data);
      setStatus({
        tone: "ok",
        text: `Added “${form.title}” under ${form.mood}.`,
      });
      setForm(EMPTY);
      setFiles({ audio: null, cover: null });
      formRef.current?.reset();
      if (onUpload) onUpload(result.song);
    } catch (err) {
      setStatus({
        tone: "stop",
        text: readError(
          err,
          "The upload didn't finish. Check the files and send again."
        ),
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <form
      ref={formRef}
      className="upload-form"
      onSubmit={handleSubmit}
      encType="multipart/form-data"
    >
      <label className="field">
        <span className="field-label">Title</span>
        <input
          type="text"
          name="title"
          value={form.title}
          onChange={handleChange}
          placeholder="Jind Mahi"
          required
        />
      </label>

      <label className="field">
        <span className="field-label">Artist</span>
        <input
          type="text"
          name="artist"
          value={form.artist}
          onChange={handleChange}
          placeholder="Amrinder Gill"
          required
        />
      </label>

      <fieldset className="field field-moods">
        <legend className="field-label">Mood it suits</legend>
        <div className="mood-radios">
          {MOODS.map((mood) => (
            <label className="mood-radio" key={mood} data-mood={mood}>
              <input
                type="radio"
                name="mood"
                value={mood}
                checked={form.mood === mood}
                onChange={handleChange}
              />
              <span>{mood}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="field">
        <span className="field-label">Audio file</span>
        <input
          type="file"
          name="audio"
          accept="audio/*"
          onChange={handleChange}
          required
        />
      </label>

      <label className="field">
        <span className="field-label">Cover image — optional</span>
        <input
          type="file"
          name="cover"
          accept="image/*"
          onChange={handleChange}
        />
      </label>

      <button type="submit" className="btn upload-submit" disabled={sending}>
        {sending ? "Adding…" : "Add track"}
      </button>

      {status && (
        <p
          className={`note ${status.tone === "stop" ? "note-stop" : ""}`}
          role="status"
        >
          {status.text}
        </p>
      )}
    </form>
  );
};

export default UploadSong;
