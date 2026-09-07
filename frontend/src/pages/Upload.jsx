import React from "react";
import UploadSong from "../components/UploadSong.jsx";
import "./Upload.css";

const FACTS = [
  ["Audio", "MP3, WAV or M4A. This is what the player streams."],
  ["Cover", "A square image looks best. Skip it and the track gets a placeholder."],
  ["Mood", "One of the four the reader can detect, so a face pointing at that mood can find it."],
];

const Upload = () => (
  <div className="page upload-page">
    <div className="page-head">
      <div>
        <h1 className="display">Add a track</h1>
        <p className="lede">
          Put your own song into the library and file it under the mood it
          suits. It shows up in search straight away.
        </p>
      </div>
    </div>

    <div className="upload-deck">
      <UploadSong />

      <aside className="upload-aside">
        <h2 className="display-sm">What travels with it</h2>
        <dl className="upload-facts">
          {FACTS.map(([term, detail]) => (
            <div key={term}>
              <dt className="micro">{term}</dt>
              <dd>{detail}</dd>
            </div>
          ))}
        </dl>
      </aside>
    </div>
  </div>
);

export default Upload;
