import React from "react";
import { Link } from "react-router-dom";

const NotFound = () => (
  <div className="page">
    <h1 className="page-title">No page here</h1>
    <p className="page-lede">
      That address doesn't lead anywhere in this player. Go back to{" "}
      <Link className="blank-link" to="/">
        reading a mood
      </Link>
      , or open the{" "}
      <Link className="blank-link" to="/library">
        library
      </Link>
      .
    </p>
  </div>
);

export default NotFound;
