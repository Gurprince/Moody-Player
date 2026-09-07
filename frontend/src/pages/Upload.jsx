import React from "react";
import UploadSong from "../components/UploadSong.jsx";
import "./Upload.css";

const Upload = () => (
  <div className="page upload-page">
    <div className="upload-head">
      <h1 className="page-title">Add a track</h1>
      <p className="page-lede">
        Put your own song into the library and file it under the mood it suits.
        It shows up in search straight away, and in anyone's results when that
        mood comes up.
      </p>
    </div>

    <div className="upload-deck">
      <UploadSong />

      <aside className="upload-aside">
        <h2 className="section-title">What travels with it</h2>
        <dl className="upload-facts">
          <div>
            <dt>Audio</dt>
            <dd>MP3, WAV or M4A. This is what the player streams.</dd>
          </div>
          <div>
            <dt>Cover</dt>
            <dd>
              A square image looks best. Skip it and the track gets the plain
              placeholder.
            </dd>
          </div>
          <div>
            <dt>Mood</dt>
            <dd>
              One of the four the reader can detect, so a face pointing at that
              mood can find it.
            </dd>
          </div>
        </dl>
      </aside>
    </div>
  </div>
);

export default Upload;
